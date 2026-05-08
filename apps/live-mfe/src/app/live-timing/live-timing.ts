import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { OpenF1Service } from '@f1-racelab/f1-data-client';
import { EventBusService } from '@f1-racelab/shared-ui';
import { Driver } from '@f1-racelab/shared-models';

@Component({
  selector: 'app-live-timing',
  standalone: true,
  imports: [CommonModule, AsyncPipe],
  templateUrl: './live-timing.html',
  styleUrl: './live-timing.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LiveTimingComponent {

  timingData$: Observable<any[]>;
  safetyCarActive$: Observable<boolean>;

  constructor(
    private openF1Service: OpenF1Service,
    private eventBus: EventBusService
  ) {
    this.timingData$ = this.openF1Service.getLiveTimingData('latest');
    this.safetyCarActive$ = this.eventBus.onSafetyCar();
  }

  onDriverClick(driver: Driver): void {
    this.eventBus.selectDriver(driver);
  }

  refresh(): void {
    this.timingData$ = this.openF1Service.getLiveTimingData('latest');
  }

  getTyreEmoji(compound: string): string {
    const tyres: Record<string, string> = {
      'SOFT':         '🔴',
      'MEDIUM':       '🟡',
      'HARD':         '⚪',
      'INTERMEDIATE': '🟢',
      'WET':          '🔵',
    };
    return tyres[compound] ?? '⚪';
  }

  getTeamColorStyle(teamColor: string): object {
    return { 'border-left': `4px solid ${teamColor}` };
  }
}