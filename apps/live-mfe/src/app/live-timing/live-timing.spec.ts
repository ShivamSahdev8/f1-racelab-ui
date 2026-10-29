import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { LiveTimingComponent } from './live-timing';
import { LiveSessionService, LiveSessionState } from '../live-session.service';

const NOW = Date.parse('2026-10-29T18:30:00Z');
const active: LiveSessionState = {
  status: 'live', activityAt: NOW,
  session: { session_key: 123, session_name: 'Race', country_name: 'Mexico', year: 2026,
    date_start: '2026-10-29T18:00:00Z', date_end: '2026-10-29T19:00:00Z' },
  entries: [{ driverId: 1, driverNumber: 1, carNumber: 1, fullName: 'Test Driver',
    firstName: 'Test', lastName: 'Driver', abbreviation: 'TST', nationality: '',
    teamName: 'Test Team', teamColor: '#e10600', headshotUrl: '', position: 1,
    compound: null, gap: '', lastLapTime: '', date: '2026-10-29T18:29:55Z' }],
};

describe('LiveTimingComponent', () => {
  let fixture: ComponentFixture<LiveTimingComponent>;
  const getState = jest.fn();
  beforeEach(async () => {
    getState.mockReset();
    jest.useFakeTimers();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    jest.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    getState.mockReturnValue(of({ status: 'idle', session: null, entries: [] }));
    await TestBed.configureTestingModule({
      imports: [LiveTimingComponent], providers: [{ provide: LiveSessionService, useValue: { getState } }],
    }).compileComponents();
  });
  afterEach(() => { fixture?.destroy(); jest.restoreAllMocks(); jest.useRealTimers(); });

  function render() {
    fixture = TestBed.createComponent(LiveTimingComponent);
    fixture.detectChanges(); jest.advanceTimersByTime(1); fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the idle message and game with no live indicator, season or timing data', () => {
    const page = render();
    expect(page.textContent).toContain('No live race is going on.');
    expect(page.querySelector('app-mini-game')).not.toBeNull();
    expect(page.querySelector('table')).toBeNull();
    expect(page.querySelector('.is-live')).toBeNull();
    expect(page.textContent).not.toContain('2024');
    expect(page.textContent).not.toContain('F1 SEASON');
  });

  it('only displays timing and a live badge for a verified live session', () => {
    getState.mockReturnValue(of(active));
    const page = render();
    expect(page.querySelector('table')?.textContent).toContain('Test Driver');
    expect(page.querySelector('.is-live')?.textContent).toContain('SESSION LIVE');
    expect(page.textContent).toContain('Mexico · Race');
    expect(page.querySelector('app-mini-game')).toBeNull();
  });

  it('clears rows and live status immediately when the session ends', () => {
    getState.mockReturnValue(of(active));
    const page = render();
    jest.mocked(Date.now).mockReturnValue(Date.parse(active.session!.date_end));
    jest.advanceTimersByTime(1000); fixture.detectChanges();
    expect(page.querySelector('table')).toBeNull();
    expect(page.querySelector('.is-live')).toBeNull();
    expect(page.textContent).toContain('No live race is going on.');
  });

  it('does not call an API outage an idle session and still offers the game', () => {
    getState.mockReturnValue(of({ status: 'unavailable', session: null, entries: [], message: 'Could not check timing.' }));
    const page = render();
    expect(page.textContent).toContain('Live timing is unavailable.');
    expect(page.textContent).not.toContain('No live race is going on.');
    expect(page.querySelector('app-mini-game')).not.toBeNull();
    expect(page.querySelector('table')).toBeNull();
  });

  it('hides timing when activity goes stale between polls', () => {
    getState.mockReturnValue(of(active));
    const page = render();
    jest.mocked(Date.now).mockReturnValue(NOW + 121000);
    jest.advanceTimersByTime(1000); fixture.detectChanges();
    expect(page.querySelector('table')).toBeNull();
    expect(page.textContent).toContain('Live timing has stopped updating.');
  });

  it('checks again without resetting an idle game', () => {
    const page = render();
    const game = page.querySelector('app-mini-game');
    page.querySelector<HTMLButtonElement>('.refresh-btn')!.click(); fixture.detectChanges();
    expect(getState).toHaveBeenCalledTimes(2);
    expect(page.querySelector('app-mini-game')).toBe(game);
  });

  it('shows checking state and stops background polling on destroy', () => {
    getState.mockReturnValue(NEVER);
    const page = render();
    expect(page.textContent).toContain('Checking the track');
    expect(page.querySelector('app-mini-game')).toBeNull();
    fixture.destroy(); jest.advanceTimersByTime(60000);
    expect(getState).toHaveBeenCalledTimes(1);
  });
});
