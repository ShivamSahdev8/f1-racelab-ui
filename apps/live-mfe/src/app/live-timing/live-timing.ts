import { Component, ChangeDetectionStrategy, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, exhaustMap, filter, finalize, fromEvent, merge, timer } from 'rxjs';
import { LiveSessionService, LiveSessionState, LiveTimingEntry, isSessionActive } from '../live-session.service';
import { MiniGameComponent } from '../mini-game/mini-game';

@Component({
  selector: 'app-live-timing',
  standalone: true,
  imports: [CommonModule, MiniGameComponent],
  templateUrl: './live-timing.html',
  styleUrl: './live-timing.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LiveTimingComponent {
  private readonly service = inject(LiveSessionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly refreshRequests = new Subject<void>();
  private readonly now = signal(Date.now());
  private readonly result = signal<LiveSessionState>({ status: 'loading', session: null, entries: [] });
  readonly isChecking = signal(false);
  readonly state = computed<LiveSessionState>(() => {
    const state = this.result();
    const now = this.now();
    if (state.status !== 'live') return state;
    if (!state.session || !isSessionActive(state.session, now)) {
      return { status: 'idle', session: null, entries: [] };
    }
    if (!state.activityAt || now - state.activityAt > 120_000) {
      return { status: 'unavailable', session: state.session, entries: [], message: 'Live timing has stopped updating. Please check again shortly.' };
    }
    return state;
  });

  constructor() {
    merge(timer(0, 30_000), this.refreshRequests, fromEvent(this.document, 'visibilitychange')).pipe(
      filter(() => !this.document.hidden),
      exhaustMap(() => {
        this.isChecking.set(true);
        return this.service.getState().pipe(finalize(() => this.isChecking.set(false)));
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(state => { this.now.set(Date.now()); this.result.set(state); });
    timer(0, 1_000).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.now.set(Date.now()));
  }

  refresh(): void { this.refreshRequests.next(); }

  getTyreColor(compound: string | null): string {
    return ({ SOFT: '#E10600', MEDIUM: '#FFD700', HARD: '#F4F6FF', INTERMEDIATE: '#00D767', WET: '#3B82F6' } as Record<string, string>)[compound ?? ''] ?? '#868EA6';
  }

  getTyreLetter(compound: string | null): string {
    return ({ SOFT: 'S', MEDIUM: 'M', HARD: 'H', INTERMEDIATE: 'I', WET: 'W' } as Record<string, string>)[compound ?? ''] ?? '—';
  }

  trackByDriver(_index: number, entry: LiveTimingEntry): number { return entry.driverNumber; }
}
