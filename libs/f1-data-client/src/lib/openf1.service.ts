import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, throwError, forkJoin } from 'rxjs';
import {
  Driver,
  LapData,
  Position,
  PitStop,
  TyreCompound
} from '@f1-racelab/shared-models';

const BASE_URL = 'https://api.openf1.org/v1';

@Injectable({ providedIn: 'root' })
export class OpenF1Service {

  constructor(private http: HttpClient) {}

  // ── Drivers ─────────────────────────────────────────

  getDrivers(sessionKey: string = 'latest'): Observable<Driver[]> {
    return this.http
      .get<any[]>(`${BASE_URL}/drivers`, {
        params: { session_key: sessionKey }
      })
      .pipe(
        map(response => response.map(this.mapDriver)),
        catchError(this.handleError)
      );
  }

  // ── Positions ────────────────────────────────────────

  getLivePositions(sessionKey: string = 'latest'): Observable<Position[]> {
    return this.http
      .get<any[]>(`${BASE_URL}/position`, {
        params: { session_key: sessionKey }
      })
      .pipe(
        map(response => response.map(this.mapPosition)),
        catchError(this.handleError)
      );
  }

  // ── Laps ─────────────────────────────────────────────

  getLaps(sessionKey: string = 'latest', driverNumber?: number): Observable<LapData[]> {
    let params: any = { session_key: sessionKey };
    if (driverNumber) params = { ...params, driver_number: driverNumber };

    return this.http
      .get<any[]>(`${BASE_URL}/laps`, { params })
      .pipe(
        map(response => response.map(this.mapLap)),
        catchError(this.handleError)
      );
  }

  // ── Pit Stops ────────────────────────────────────────

  getPitStops(sessionKey: string = 'latest'): Observable<PitStop[]> {
    return this.http
      .get<any[]>(`${BASE_URL}/pit`, {
        params: { session_key: sessionKey }
      })
      .pipe(
        map(response => response.map(this.mapPitStop)),
        catchError(this.handleError)
      );
  }

  // Add this method to the service
getLiveTimingData(sessionKey: string = 'latest'): Observable<any[]> {
  return forkJoin({
    drivers:   this.getDrivers(sessionKey),
    positions: this.getLivePositions(sessionKey),
    stints:    this.getStints(sessionKey),
  }).pipe(
    map(({ drivers, positions, stints }) => {

      // Step 1 — keep only LATEST position per driver
      const latestPositions = positions.reduce((acc: any, pos: any) => {
        if (!acc[pos.driverNumber] || 
            pos.currentLap > acc[pos.driverNumber].currentLap) {
          acc[pos.driverNumber] = pos;
        }
        return acc;
      }, {});

      // Step 2 — get latest stint per driver (for tyre compound)
      const latestStints = stints.reduce((acc: any, stint: any) => {
        if (!acc[stint.driverNumber] ||
            stint.stint > acc[stint.driverNumber].stint) {
          acc[stint.driverNumber] = stint;
        }
        return acc;
      }, {});
      
      // Step 3 — merge driver + position + stint
      return Object.values(latestPositions)
        .map((pos: any) => {
          const driver = drivers.find(d => d.driverId === pos.driverNumber);
          const stint  = latestStints[pos.driverNumber];
          return {
            ...pos,
            ...driver,
            compound: stint?.compound ?? null,
          };
        })
        .sort((a: any, b: any) => a.position - b.position); // sort by position
    }),
    catchError(this.handleError)
  );
}

getStints(sessionKey: string = 'latest'): Observable<any[]> {
  return this.http
    .get<any[]>(`${BASE_URL}/stints`, {
      params: { session_key: sessionKey }
    })
    .pipe(
      map(response => response.map(this.mapStint)),
      catchError(this.handleError)
    );
}

private mapStint = (raw: any): any => ({
  driverNumber: raw.driver_number,
  stint:        raw.stint_number,
  compound:     raw.compound,
  lapStart:     raw.lap_start,
  lapEnd:       raw.lap_end,
  tyreAge:      raw.tyre_age_at_start,
});
  // ── Mappers ──────────────────────────────────────────

  private mapDriver = (raw: any): Driver => ({
    driverId:     raw.driver_number,
    fullName:     raw.full_name,
    firstName:    raw.first_name,
    lastName:     raw.last_name,
    abbreviation: raw.name_acronym,
    nationality:  raw.country_code,
    teamName:     raw.team_name,
    teamColor:    `#${raw.team_colour}`,
    carNumber:    raw.driver_number,
    headshotUrl:  raw.headshot_url
  });

  private mapPosition = (raw: any): Position => ({
    driverNumber: raw.driver_number,
    driverName:   '',
    teamName:     '',
    teamColor:    '',
    position:     raw.position,
    gap:          '',
    interval:     '',
    lastLapTime:  '',
    currentLap:   raw.lap_number,
    tyreCompound: 'SOFT' as TyreCompound,
    pitStops:     0,
    status:       'ON_TRACK'
  });

  private mapLap = (raw: any): LapData => ({
    driverNumber: raw.driver_number,
    lapNumber:    raw.lap_number,
    lapTime:      raw.lap_duration?.toString() ?? '',
    lapDuration:  raw.lap_duration,
    sector1:      raw.duration_sector_1,
    sector2:      raw.duration_sector_2,
    sector3:      raw.duration_sector_3,
    isPitOutLap:  raw.is_pit_out_lap,
    stint:        raw.stint_number,
    compound:     raw.compound as TyreCompound
  });

  private mapPitStop = (raw: any): PitStop => ({
    driverNumber: raw.driver_number,
    lapNumber:    raw.lap_number,
    duration:     raw.pit_duration,
    pitInTime:    raw.date,
    pitOutTime:   ''
  });

  // ── Error Handler ────────────────────────────────────

  private handleError(error: any): Observable<never> {
    console.error('OpenF1 API Error:', error);
    return throwError(() => new Error(error.message));
  }
}