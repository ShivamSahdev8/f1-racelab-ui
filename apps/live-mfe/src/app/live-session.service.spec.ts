import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LiveSession, LiveSessionService, LiveSessionState, isSessionActive } from './live-session.service';

const API = 'https://api.openf1.org/v1';
const NOW = Date.parse('2026-10-29T18:30:00Z');
const SESSION: LiveSession = {
  session_key: 12345, session_name: 'Race', country_name: 'Mexico', year: 2026,
  date_start: '2026-10-29T18:00:00Z', date_end: '2026-10-29T20:00:00Z',
};

describe('LiveSessionService', () => {
  let http: HttpTestingController;
  let service: LiveSessionService;
  let state: LiveSessionState | undefined;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['Date'] });
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(LiveSessionService);
    state = undefined;
  });

  afterEach(() => { http.verify(); jest.restoreAllMocks(); jest.useRealTimers(); });

  function start(session: LiveSession | null = SESSION) {
    service.getState().subscribe(value => state = value);
    const request = http.expectOne(`${API}/sessions?session_key=latest`);
    request.flush(session ? [session] : []);
  }

  function timing(positions: object[] = [
    { driver_number: 1, session_key: 12345, position: 2, date: '2026-10-29T18:29:55Z' },
    { driver_number: 1, session_key: 12345, position: 7, date: '2026-10-29T18:29:00Z' },
  ], intervals: object[] = [], extraDrivers: object[] = []) {
    http.expectOne(request => request.url === `${API}/drivers`).flush([
      { driver_number: 1, full_name: 'Max Verstappen', name_acronym: 'VER', team_name: 'Red Bull Racing' },
      ...extraDrivers,
    ]);
    const positionRequest = http.expectOne(request => request.url === `${API}/position`);
    expect(positionRequest.request.params.get('session_key')).toBe('12345');
    expect(positionRequest.request.params.get('date>=')).toBe('2026-10-29T18:00:00.000Z');
    positionRequest.flush(positions);
    http.expectNone(request => request.url === `${API}/intervals`);
    jest.advanceTimersByTime(1100);
    http.expectOne(request => request.url === `${API}/stints`).flush([]);
    http.expectOne(request => request.url === `${API}/intervals`).flush(intervals);
    http.expectOne(request => request.url === `${API}/laps`).flush([]);
  }

  it.each([
    ['historical', { ...SESSION, year: 2024 }],
    ['ended', { ...SESSION, date_end: '2026-10-29T18:30:00Z' }],
    ['future', { ...SESSION, date_start: '2026-10-29T18:31:00Z' }],
    ['invalid date', { ...SESSION, date_start: 'unknown' }],
    ['cancelled', { ...SESSION, is_cancelled: true }],
    ['no session', null],
  ])('does not request timing for %s sessions', (_name, session) => {
    start(session);
    expect(state).toEqual({ status: 'idle', session: null, entries: [] });
    http.expectNone(request => request.url !== `${API}/sessions`);
  });

  it('only marks the exact session live with fresh positions and chooses newest timestamp', () => {
    start(); timing();
    expect(state?.status).toBe('live');
    expect(state?.entries[0].position).toBe(2);
    expect(state?.entries[0].compound).toBeNull();
    expect(state?.activityAt).toBe(Date.parse('2026-10-29T18:29:55Z'));
  });

  it('does not present stale, future, or wrong-session positions as live', () => {
    start(); timing([
      { driver_number: 1, position: 1, date: '2026-10-29T18:20:00Z' },
      { driver_number: 1, position: 1, date: '2026-10-29T19:00:00Z' },
      { driver_number: 1, session_key: 999, position: 1, date: '2026-10-29T18:29:59Z' },
    ]);
    expect(state?.status).toBe('unavailable');
    expect(state?.entries).toEqual([]);
  });

  it('retains steady drivers using current-session positions when fresh intervals confirm activity', () => {
    start(); timing([
      { driver_number: 1, session_key: 12345, position: 1, date: '2026-10-29T18:05:00Z' },
      { driver_number: 4, session_key: 12345, position: 2, date: '2026-10-29T18:05:00Z' },
    ], [
      { driver_number: 4, session_key: 12345, gap_to_leader: 1.25, date: '2026-10-29T18:29:58Z' },
    ], [
      { driver_number: 4, full_name: 'Lando Norris', name_acronym: 'NOR' },
    ]);
    expect(state?.status).toBe('live');
    expect(state?.entries.map(entry => entry.driverNumber)).toEqual([1, 4]);
    expect(state?.entries[1].gap).toBe('+1.250');
    expect(state?.activityAt).toBe(Date.parse('2026-10-29T18:29:58Z'));
  });

  it('discards data if the session ends while requests are running', () => {
    start();
    jest.mocked(Date.now).mockReturnValue(Date.parse(SESSION.date_end));
    timing();
    expect(state).toEqual({ status: 'idle', session: null, entries: [] });
  });

  it('distinguishes session API failure from no live session', () => {
    service.getState().subscribe(value => state = value);
    http.expectOne(`${API}/sessions?session_key=latest`).flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    expect(state?.status).toBe('unavailable');
    expect(state?.entries).toEqual([]);
  });

  it('does not turn denied live data access into a historical fallback', () => {
    start();
    const requests = http.match(request => request.url !== `${API}/sessions`);
    requests.find(request => request.request.url === `${API}/position`)!.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    expect(state?.status).toBe('unavailable');
    expect(state?.session?.session_key).toBe(12345);
    expect(state?.entries).toEqual([]);
  });

  it('limits the whole check to ten seconds', () => {
    jest.useFakeTimers({ doNotFake: ['Date'] });
    service.getState().subscribe(value => state = value);
    http.expectOne(`${API}/sessions?session_key=latest`);
    jest.advanceTimersByTime(10_000);
    expect(state?.status).toBe('unavailable');
    expect(state?.entries).toEqual([]);
  });

  it('starts inclusively and ends exclusively at UTC session boundaries', () => {
    expect(isSessionActive(SESSION, Date.parse(SESSION.date_start))).toBe(true);
    expect(isSessionActive(SESSION, Date.parse(SESSION.date_end))).toBe(false);
  });
});
