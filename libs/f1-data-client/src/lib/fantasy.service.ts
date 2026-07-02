import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';

/**
 * ── Fantasy League API contract ──────────────────────────────
 * Backend (f1-racelab-api, Python lambdas) must implement:
 *
 *   GET  /fantasy/drivers            → FantasyDriver[]
 *   GET  /fantasy/team/{userId}      → FantasyTeam | 404
 *   PUT  /fantasy/team/{userId}      → FantasyTeam   (body: SaveTeamRequest)
 *   GET  /fantasy/leaderboard        → LeaderboardEntry[]
 *
 * Rules enforced server-side (mirrored in the UI):
 *   - exactly 5 driver ids, all distinct, all valid
 *   - sum of driver prices ≤ 100.0 (million)
 *
 * While the backend is under construction USE_MOCK = true serves
 * realistic data locally and persists the team in localStorage.
 * Flip to false + set FANTASY_API_URL once the API is deployed.
 * ─────────────────────────────────────────────────────────────
 */

export interface FantasyDriver {
  /** Three-letter driver code, e.g. 'VER' */
  id: string;
  name: string;
  team: string;
  /** Price in $ millions, e.g. 30.5 */
  price: number;
  /** Season fantasy points scored so far */
  points: number;
}

export interface SaveTeamRequest {
  driverIds: string[];
}

export interface FantasyTeam {
  userId: string;
  driverIds: string[];
  /** $ millions spent */
  spent: number;
  /** Season total across all scored races */
  totalPoints: number;
  updatedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  favouriteTeam: string;
  totalPoints: number;
}

const FANTASY_API_URL = 'https://yo8jy0lpwl.execute-api.us-east-2.amazonaws.com/prod';
const USE_MOCK = true;
const TEAM_STORAGE_KEY = 'f1rl_fantasy_team';
export const FANTASY_BUDGET = 100.0;
export const FANTASY_TEAM_SIZE = 5;

/** 2026 grid with fantasy prices — mirrors what GET /fantasy/drivers will return */
const MOCK_DRIVERS: FantasyDriver[] = [
  { id: 'VER', name: 'Max Verstappen',   team: 'Red Bull',      price: 30.5, points: 245 },
  { id: 'NOR', name: 'Lando Norris',     team: 'McLaren',       price: 29.0, points: 230 },
  { id: 'PIA', name: 'Oscar Piastri',    team: 'McLaren',       price: 27.5, points: 210 },
  { id: 'LEC', name: 'Charles Leclerc',  team: 'Ferrari',       price: 26.5, points: 218 },
  { id: 'RUS', name: 'George Russell',   team: 'Mercedes',      price: 24.0, points: 195 },
  { id: 'HAM', name: 'Lewis Hamilton',   team: 'Ferrari',       price: 23.5, points: 180 },
  { id: 'SAI', name: 'Carlos Sainz',     team: 'Williams',      price: 19.5, points: 170 },
  { id: 'ALO', name: 'Fernando Alonso',  team: 'Aston Martin',  price: 16.0, points: 92 },
  { id: 'ANT', name: 'Kimi Antonelli',   team: 'Mercedes',      price: 15.5, points: 118 },
  { id: 'ALB', name: 'Alexander Albon',  team: 'Williams',      price: 13.0, points: 86 },
  { id: 'PER', name: 'Sergio Perez',     team: 'Cadillac',      price: 12.0, points: 64 },
  { id: 'GAS', name: 'Pierre Gasly',     team: 'Alpine',        price: 11.0, points: 55 },
  { id: 'HUL', name: 'Nico Hulkenberg',  team: 'Audi',          price: 9.5,  points: 48 },
  { id: 'OCO', name: 'Esteban Ocon',     team: 'Haas',          price: 9.0,  points: 44 },
  { id: 'STR', name: 'Lance Stroll',     team: 'Aston Martin',  price: 8.5,  points: 30 },
  { id: 'BEA', name: 'Oliver Bearman',   team: 'Haas',          price: 8.0,  points: 38 },
  { id: 'LAW', name: 'Liam Lawson',      team: 'Racing Bulls',  price: 7.5,  points: 26 },
  { id: 'BOT', name: 'Valtteri Bottas',  team: 'Cadillac',      price: 7.0,  points: 18 },
  { id: 'COL', name: 'Franco Colapinto', team: 'Alpine',        price: 6.5,  points: 12 },
  { id: 'HAD', name: 'Isack Hadjar',     team: 'Racing Bulls',  price: 6.0,  points: 22 },
];

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: 'u-01', userName: 'ApexHunter',    favouriteTeam: 'McLaren',      totalPoints: 1284 },
  { rank: 2, userId: 'u-02', userName: 'BoxBoxBox',     favouriteTeam: 'Ferrari',      totalPoints: 1241 },
  { rank: 3, userId: 'u-03', userName: 'DirtyAirDan',   favouriteTeam: 'Red Bull',     totalPoints: 1198 },
  { rank: 4, userId: 'u-04', userName: 'UndercutQueen', favouriteTeam: 'Mercedes',     totalPoints: 1150 },
  { rank: 5, userId: 'u-05', userName: 'GravelTrap',    favouriteTeam: 'Williams',     totalPoints: 1102 },
  { rank: 6, userId: 'u-06', userName: 'DRS_Enabled',   favouriteTeam: 'Aston Martin', totalPoints: 1067 },
  { rank: 7, userId: 'u-07', userName: 'LateBraker',    favouriteTeam: 'Alpine',       totalPoints: 1019 },
  { rank: 8, userId: 'u-08', userName: 'PurpleSector',  favouriteTeam: 'Ferrari',      totalPoints: 984 },
];

@Injectable({ providedIn: 'root' })
export class FantasyService {

  constructor(private http: HttpClient) {}

  getDrivers(): Observable<FantasyDriver[]> {
    if (USE_MOCK) {
      return of(MOCK_DRIVERS).pipe(delay(600));
    }
    return this.http.get<FantasyDriver[]>(`${FANTASY_API_URL}/fantasy/drivers`);
  }

  getTeam(userId: string): Observable<FantasyTeam | null> {
    if (USE_MOCK) {
      return of(this.readStoredTeam(userId)).pipe(delay(300));
    }
    return this.http.get<FantasyTeam | null>(`${FANTASY_API_URL}/fantasy/team/${encodeURIComponent(userId)}`);
  }

  saveTeam(userId: string, request: SaveTeamRequest): Observable<FantasyTeam> {
    if (USE_MOCK) {
      const spent = request.driverIds
        .map(id => MOCK_DRIVERS.find(d => d.id === id)?.price ?? 0)
        .reduce((a, b) => a + b, 0);
      const team: FantasyTeam = {
        userId,
        driverIds: request.driverIds,
        spent: Math.round(spent * 10) / 10,
        totalPoints: this.readStoredTeam(userId)?.totalPoints ?? 0,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(team));
      return of(team).pipe(delay(500));
    }
    return this.http.put<FantasyTeam>(
      `${FANTASY_API_URL}/fantasy/team/${encodeURIComponent(userId)}`,
      request
    );
  }

  getLeaderboard(userId?: string): Observable<LeaderboardEntry[]> {
    if (USE_MOCK) {
      return of(MOCK_LEADERBOARD).pipe(
        delay(400),
        map(entries => this.spliceInCurrentUser(entries, userId))
      );
    }
    return this.http.get<LeaderboardEntry[]>(`${FANTASY_API_URL}/fantasy/leaderboard`);
  }

  /** Mock helper: show the signed-in user on the board once they have a saved team */
  private spliceInCurrentUser(entries: LeaderboardEntry[], userId?: string): LeaderboardEntry[] {
    if (!userId) return entries;
    const team = this.readStoredTeam(userId);
    if (!team) return entries;
    const you: LeaderboardEntry = {
      rank: 0,
      userId,
      userName: 'You',
      favouriteTeam: '',
      totalPoints: team.totalPoints,
    };
    const merged = [...entries, you].sort((a, b) => b.totalPoints - a.totalPoints);
    return merged.map((e, i) => ({ ...e, rank: i + 1 }));
  }

  private readStoredTeam(userId: string): FantasyTeam | null {
    try {
      const raw = localStorage.getItem(TEAM_STORAGE_KEY);
      if (!raw) return null;
      const team = JSON.parse(raw) as FantasyTeam;
      return team.userId === userId ? team : null;
    } catch {
      return null;
    }
  }
}
