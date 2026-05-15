import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { ErgastService } from '@f1-racelab/f1-data-client';
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

  constructor(private ergastService: ErgastService) {
    this.driverStandings$ = this.ergastService.getDriverStandings('current');
    this.teamStandings$   = this.ergastService.getTeamStandings('current');
  }

  setTab(tab: ActiveTab): void {
    this.activeTab = tab;
  }
}