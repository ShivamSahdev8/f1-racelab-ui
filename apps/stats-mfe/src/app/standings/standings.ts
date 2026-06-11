import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Observable, map } from 'rxjs';
import { ErgastService } from '@f1-racelab/f1-data-client';
import { AuthStateService } from '@f1-racelab/shared-ui';
import { DriverStanding, TeamStanding } from '@f1-racelab/shared-models';

type ActiveTab = 'drivers' | 'teams';

@Component({
  selector: 'app-standings',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  templateUrl: './standings.html',
  styleUrl: './standings.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Standings {

  activeTab: ActiveTab = 'drivers';
  driverStandings$: Observable<DriverStanding[]>;
  teamStandings$: Observable<TeamStanding[]>;
  favouriteTeam$: Observable<string | null>;

  constructor(
    private ergastService: ErgastService,
    private authState: AuthStateService
  ) {
    this.driverStandings$ = this.ergastService.getDriverStandings('current');
    this.teamStandings$   = this.ergastService.getTeamStandings('current');
    this.favouriteTeam$   = this.authState.user$.pipe(
      map(user => user?.favouriteTeam ?? null)
    );
  }

  setTab(tab: ActiveTab): void {
    this.activeTab = tab;
  }

  getPositionClass(pos: number): string {
    if (pos === 1) return 'pos-p1';
    if (pos === 2) return 'pos-p2';
    if (pos === 3) return 'pos-p3';
    return '';
  }

  /** Fuzzy match — Cognito stores e.g. "Red Bull", Ergast returns "Red Bull Racing" */
  isFavouriteTeam(teamName: string, favourite: string | null): boolean {
    if (!favourite || !teamName) return false;
    const a = teamName.toLowerCase();
    const b = favourite.toLowerCase();
    return a.includes(b) || b.includes(a);
  }

  /** Points bar width relative to championship leader */
  getBarWidth(points: number, leaderPoints: number): string {
    if (!leaderPoints) return '0%';
    return `${Math.max((points / leaderPoints) * 100, 2)}%`;
  }

  trackByPosition(index: number, entry: { position: number }): number {
    return entry.position ?? index;
  }
}
