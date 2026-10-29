import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, switchMap, timeout, timer } from 'rxjs';
import type { Driver } from '@f1-racelab/shared-models';

const API = 'https://api.openf1.org/v1';
const FRESH_ACTIVITY_MS = 120_000;

export interface LiveSession {
  session_key: number;
  session_name: string;
  date_start: string;
  date_end: string;
  year: number;
  country_name: string;
  location?: string;
  is_cancelled?: boolean;
}

export interface LiveTimingEntry extends Driver {
  driverNumber: number;
  position: number;
  compound: string | null;
  gap: string;
  lastLapTime: string;
  date: string;
}

export interface LiveSessionState {
  status: 'loading' | 'idle' | 'live' | 'unavailable';
  session: LiveSession | null;
  entries: LiveTimingEntry[];
  activityAt?: number;
  message?: string;
}

interface RawRecord {
  driver_number: number;
  session_key?: number;
  date?: string;
  date_start?: string;
  position?: number;
  stint_number?: number;
  lap_number?: number;
  gap_to_leader?: string | number | null;
  lap_duration?: number | null;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  name_acronym?: string;
  country_code?: string;
  team_name?: string;
  team_colour?: string;
  headshot_url?: string;
  compound?: string;
}

export function isSessionActive(session: LiveSession, now = Date.now()): boolean {
  const start = Date.parse(session.date_start);
  const end = Date.parse(session.date_end);
  return session.year === new Date(now).getUTCFullYear()
    && Number.isInteger(session.session_key) && session.session_key > 0
    && !session.is_cancelled && Number.isFinite(start) && Number.isFinite(end)
    && start <= now && now < end;
}

/** Private to live-mfe: another remote cannot supply an older shared OpenF1 service. */
@Injectable({ providedIn: 'root' })
export class LiveSessionService {
  private readonly http = inject(HttpClient);

  getState(): Observable<LiveSessionState> {
    return this.http.get<LiveSession[]>(`${API}/sessions`, {
      params: { session_key: 'latest' },
    }).pipe(
      timeout(10_000),
      switchMap(sessions => {
        if (!Array.isArray(sessions)) throw new Error('Invalid session response');
        const session = sessions.filter(item => isSessionActive(item))
          .sort((a, b) => Date.parse(b.date_start) - Date.parse(a.date_start))[0];
        if (!session) return of<LiveSessionState>({ status: 'idle', session: null, entries: [] });
        return this.getTiming(session);
      }),
      timeout(10_000),
      catchError(() => of<LiveSessionState>({
        status: 'unavailable', session: null, entries: [],
        message: 'We can’t check live timing right now. Please try again shortly.',
      })),
    );
  }

  private getTiming(session: LiveSession): Observable<LiveSessionState> {
    const now = Date.now();
    const sessionParams = { session_key: String(session.session_key) };
    const sessionStart = new Date(session.date_start).toISOString();
    const activitySince = new Date(Math.max(Date.parse(session.date_start), now - FRESH_ACTIVITY_MS)).toISOString();
    const recentSince = new Date(Math.max(Date.parse(session.date_start), now - 300_000)).toISOString();
    const optional = (path: string, params: Record<string, string>) => this.http.get<RawRecord[]>(`${API}/${path}`, { params }).pipe(
      timeout(10_000), catchError(() => of<RawRecord[]>([])),
    );
    return forkJoin({
      drivers: this.http.get<RawRecord[]>(`${API}/drivers`, { params: sessionParams }),
      positions: this.http.get<RawRecord[]>(`${API}/position`, {
        // Positions are change events. Read this session's history so steady drivers stay visible.
        params: { ...sessionParams, 'date>=': sessionStart },
      }),
    }).pipe(
      // Session + drivers + positions use the first three-request window. OpenF1 limits bursts.
      switchMap(core => timer(1100).pipe(
        switchMap(() => forkJoin({
          stints: optional('stints', sessionParams),
          intervals: optional('intervals', { ...sessionParams, 'date>=': activitySince }),
          laps: optional('laps', { ...sessionParams, 'date_start>=': recentSince }),
        })),
        map(extra => ({ ...core, ...extra })),
      )),
      timeout(10_000),
      map(({ drivers, positions, stints, intervals, laps }): LiveSessionState => {
        const checkedAt = Date.now();
        if (!isSessionActive(session, checkedAt)) return { status: 'idle', session: null, entries: [] };
        if (!Array.isArray(drivers) || !Array.isArray(positions)) throw new Error('Invalid timing response');
        const belongsToSession = (row: RawRecord) => row.session_key == null || row.session_key === session.session_key;
        const eventTime = (row: RawRecord) => Date.parse(row.date ?? row.date_start ?? '');
        const validEvent = (row: RawRecord) => {
          const date = eventTime(row);
          return belongsToSession(row) && Number.isFinite(date)
            && date >= Date.parse(session.date_start) && date <= checkedAt;
        };
        const validPositions = positions.filter(position => {
          const date = Date.parse(position.date ?? '');
          return Number.isFinite(date) && date <= checkedAt
            && date >= Date.parse(session.date_start) && Number.isInteger(position.position) && (position.position ?? 0) > 0
            && belongsToSession(position);
        });
        const validIntervals = (Array.isArray(intervals) ? intervals : []).filter(validEvent);
        const validLaps = (Array.isArray(laps) ? laps : []).filter(validEvent);
        const activityAt = [...validPositions, ...validIntervals, ...validLaps]
          .reduce((latest, row) => Math.max(latest, eventTime(row)), 0);
        const freshActivity = activityAt >= checkedAt - FRESH_ACTIVITY_MS;
        const newest = this.latestByDriver(validPositions, row => Date.parse(row.date ?? ''));
        const latestStints = this.latestByDriver((Array.isArray(stints) ? stints : []).filter(belongsToSession), row => row.stint_number ?? 0);
        const latestIntervals = this.latestByDriver(validIntervals, row => Date.parse(row.date ?? ''));
        const latestLaps = this.latestByDriver(validLaps, row => row.lap_number ?? 0);
        const entries = [...newest.values()].flatMap(position => {
          const driver = drivers.find(item => item.driver_number === position.driver_number
            && (item.session_key == null || item.session_key === session.session_key));
          if (!driver) return [];
          const lap = latestLaps.get(position.driver_number);
          const gap = latestIntervals.get(position.driver_number)?.gap_to_leader;
          return [{
            driverId: driver.driver_number, driverNumber: driver.driver_number, carNumber: driver.driver_number,
            fullName: driver.full_name ?? `Driver ${driver.driver_number}`,
            firstName: driver.first_name ?? '', lastName: driver.last_name ?? '',
            abbreviation: driver.name_acronym ?? String(driver.driver_number), nationality: driver.country_code ?? '',
            teamName: driver.team_name ?? '', teamColor: /^[\da-f]{6}$/i.test(driver.team_colour ?? '') ? `#${driver.team_colour}` : '#868EA6',
            headshotUrl: driver.headshot_url ?? '', position: position.position!, date: position.date ?? '',
            compound: latestStints.get(position.driver_number)?.compound ?? null,
            gap: typeof gap === 'number' && Number.isFinite(gap) ? `+${gap.toFixed(3)}` : typeof gap === 'string' ? gap : '',
            lastLapTime: this.lapTime(lap?.lap_duration),
          }];
        }).sort((a, b) => a.position - b.position);
        if (!freshActivity || !entries.length) return {
          status: 'unavailable', session, entries: [],
          message: 'A session is scheduled now, but fresh live timing isn’t available. Please try again shortly.',
        };
        return { status: 'live', session, entries, activityAt };
      }),
      catchError(() => of<LiveSessionState>({
        status: 'unavailable', session, entries: [],
        message: 'A session is scheduled now, but live timing isn’t available. Please try again shortly.',
      })),
    );
  }

  private latestByDriver(rows: RawRecord[], order: (row: RawRecord) => number): Map<number, RawRecord> {
    const result = new Map<number, RawRecord>();
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!Number.isInteger(row.driver_number)) continue;
      const previous = result.get(row.driver_number);
      if (!previous || order(row) > order(previous)) result.set(row.driver_number, row);
    }
    return result;
  }

  private lapTime(seconds: unknown): string {
    if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return '';
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(3).padStart(6, '0')}`;
  }
}
