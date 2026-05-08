import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import {
  Race,
  Circuit,
  DriverStanding,
  TeamStanding,
  Driver
} from '@f1-racelab/shared-models';

const BASE_URL = 'https://api.jolpi.ca/ergast/f1';

@Injectable({ providedIn: 'root' })
export class ErgastService {

  constructor(private http: HttpClient) {}

  // ── Race Calendar ────────────────────────────────────

  getRaceCalendar(season: string = 'current'): Observable<Race[]> {
    return this.http
      .get<any>(`${BASE_URL}/${season}.json`)
      .pipe(
        map(res => res.MRData.RaceTable.Races.map(this.mapRace)),
        catchError(this.handleError)
      );
  }

  // ── Race Results ─────────────────────────────────────

  getRaceResults(season: string = 'current', round: string = 'last'): Observable<any> {
    return this.http
      .get<any>(`${BASE_URL}/${season}/${round}/results.json`)
      .pipe(
        map(res => res.MRData.RaceTable.Races[0]),
        catchError(this.handleError)
      );
  }

  // ── Driver Standings ─────────────────────────────────

  getDriverStandings(season: string = 'current'): Observable<DriverStanding[]> {
    return this.http
      .get<any>(`${BASE_URL}/${season}/driverStandings.json`)
      .pipe(
        map(res =>
          res.MRData.StandingsTable.StandingsLists[0].DriverStandings.map(
            this.mapDriverStanding
          )
        ),
        catchError(this.handleError)
      );
  }

  // ── Team Standings ───────────────────────────────────

  getTeamStandings(season: string = 'current'): Observable<TeamStanding[]> {
    return this.http
      .get<any>(`${BASE_URL}/${season}/constructorStandings.json`)
      .pipe(
        map(res =>
          res.MRData.StandingsTable.StandingsLists[0].ConstructorStandings.map(
            this.mapTeamStanding
          )
        ),
        catchError(this.handleError)
      );
  }

  // ── Circuits ─────────────────────────────────────────

  getCircuits(season: string = 'current'): Observable<Circuit[]> {
    return this.http
      .get<any>(`${BASE_URL}/${season}/circuits.json`)
      .pipe(
        map(res => res.MRData.CircuitTable.Circuits.map(this.mapCircuit)),
        catchError(this.handleError)
      );
  }

  // ── Mappers ──────────────────────────────────────────

  private mapRace = (raw: any): Race => ({
    raceId:      raw.round,
    season:      parseInt(raw.season),
    round:       parseInt(raw.round),
    raceName:    raw.raceName,
    circuitName: raw.Circuit.circuitName,
    country:     raw.Circuit.Location.country,
    city:        raw.Circuit.Location.locality,
    date:        raw.date,
    time:        raw.time ?? '',
    laps:        0
  });

  private mapDriverStanding = (raw: any): DriverStanding => ({
    position: parseInt(raw.position),
    points:   parseInt(raw.points),
    wins:     parseInt(raw.wins),
    podiums:  0,
    driver: {
      driverId:     raw.Driver.permanentNumber,
      fullName:     `${raw.Driver.givenName} ${raw.Driver.familyName}`,
      firstName:    raw.Driver.givenName,
      lastName:     raw.Driver.familyName,
      abbreviation: raw.Driver.code,
      nationality:  raw.Driver.nationality,
      teamName:     raw.Constructors[0].name,
      teamColor:    '',
      carNumber:    parseInt(raw.Driver.permanentNumber),
      headshotUrl:  ''
    } as Driver
  });

  private mapTeamStanding = (raw: any): TeamStanding => ({
    position:  parseInt(raw.position),
    teamName:  raw.Constructor.name,
    teamColor: '',
    points:    parseInt(raw.points),
    wins:      parseInt(raw.wins)
  });

  private mapCircuit = (raw: any): Circuit => ({
    circuitId:       raw.circuitId,
    circuitName:     raw.circuitName,
    country:         raw.Location.country,
    city:            raw.Location.locality,
    length:          0,
    laps:            0,
    lapRecord:       '',
    lapRecordDriver: ''
  });

  // ── Error Handler ────────────────────────────────────

  private handleError(error: any): Observable<never> {
    console.error('Ergast API Error:', error);
    return throwError(() => new Error(error.message));
  }
}