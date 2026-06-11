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
  isRefreshing = false;

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
    this.isRefreshing = true;
    this.timingData$ = this.openF1Service.getLiveTimingData('latest');
    setTimeout(() => { this.isRefreshing = false; }, 800);
  }

  getTyreColor(compound: string): string {
    const colors: Record<string, string> = {
      'SOFT':         '#E10600',
      'MEDIUM':       '#FFD700',
      'HARD':         '#F4F6FF',
      'INTERMEDIATE': '#00D767',
      'WET':          '#3B82F6',
    };
    return colors[compound] ?? '#868EA6';
  }

  getTyreLetter(compound: string): string {
    const letters: Record<string, string> = {
      'SOFT':         'S',
      'MEDIUM':       'M',
      'HARD':         'H',
      'INTERMEDIATE': 'I',
      'WET':          'W',
    };
    return letters[compound] ?? '?';
  }

  getPositionClass(pos: number): string {
    if (pos === 1) return 'pos-p1';
    if (pos === 2) return 'pos-p2';
    if (pos === 3) return 'pos-p3';
    return '';
  }

  isLeader(pos: number): boolean {
    return pos === 1;
  }

  trackByDriver(index: number, entry: any): any {
    return entry.driverNumber ?? index;
  }
}
