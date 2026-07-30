import { Component, ChangeDetectionStrategy, ChangeDetectorRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthStateService, AuthUser } from '@f1-racelab/shared-ui';
import {
  FantasyService,
  FantasyDriver,
  FantasyTeam,
  LeaderboardEntry,
  FANTASY_BUDGET,
  FANTASY_TEAM_SIZE,
} from '@f1-racelab/f1-data-client';

type ActiveTab = 'builder' | 'leaderboard';

/** Team accent colors — same palette as the signup team picker */
const TEAM_COLORS: Record<string, string> = {
  'ferrari':       '#ED1131',
  'mclaren':       '#F47600',
  'red bull':      '#4781D7',
  'mercedes':      '#00D7B6',
  'aston martin':  '#229971',
  'alpine':        '#00A1E8',
  'williams':      '#1868DB',
  'racing bulls':  '#6C98FF',
  'haas':          '#9C9FA2',
  'audi':          '#F50537',
  'cadillac':      '#909090',
};

@Component({
  selector: 'app-fantasy-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fantasy-preview.html',
  styleUrl: './fantasy-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FantasyPreview {

  isLoggedIn$: Observable<boolean>;
  user$: Observable<AuthUser | null>;

  readonly budget = FANTASY_BUDGET;
  readonly teamSize = FANTASY_TEAM_SIZE;
  readonly emptySlotFillers = Array.from({ length: FANTASY_TEAM_SIZE });

  /**
   * Fantasy is still under construction. Logged-in users land on the
   * coming-soon card and can opt into a preview of the finished UI.
   */
  showPreview = signal(false);

  // Tabs
  activeTab: ActiveTab = 'builder';

  // Builder state
  drivers = signal<FantasyDriver[]>([]);
  pickedIds = signal<string[]>([]);
  driversLoading = signal(true);
  saving = signal(false);
  savedAt = signal<string | null>(null);
  saveError = signal<string | null>(null);
  /** Ids as saved on the server — used to detect unsaved changes */
  private persistedIds = signal<string[]>([]);

  // Leaderboard state
  leaderboard = signal<LeaderboardEntry[]>([]);
  leaderboardLoading = signal(false);

  // Derived
  picked = computed(() => {
    const byId = new Map(this.drivers().map(d => [d.id, d]));
    return this.pickedIds()
      .map(id => byId.get(id))
      .filter((d): d is FantasyDriver => !!d);
  });
  spent = computed(() =>
    Math.round(this.picked().reduce((sum, d) => sum + d.price, 0) * 10) / 10
  );
  remaining = computed(() => Math.round((this.budget - this.spent()) * 10) / 10);
  spentPct = computed(() => Math.min(100, (this.spent() / this.budget) * 100));
  teamFull = computed(() => this.pickedIds().length >= this.teamSize);
  isDirty = computed(() =>
    [...this.pickedIds()].sort().join(',') !== [...this.persistedIds()].sort().join(',')
  );

  private userId: string | null = null;

  constructor(
    private authState: AuthStateService,
    private fantasy: FantasyService,
    private cdr: ChangeDetectorRef
  ) {
    this.isLoggedIn$ = this.authState.isLoggedIn$;
    this.user$ = this.authState.user$;

    this.authState.user$.subscribe(user => {
      this.userId = user?.email ?? null;
    });
  }

  // ── Preview mode ────────────────────────────────────────────
  openPreview(): void {
    this.showPreview.set(true);
    this.activeTab = 'builder';
    if (!this.drivers().length) this.loadBuilder();
  }

  closePreview(): void {
    this.showPreview.set(false);
  }

  // ── Data loading ────────────────────────────────────────────
  loadBuilder(): void {
    this.driversLoading.set(true);
    this.fantasy.getDrivers().subscribe({
      next: drivers => {
        this.drivers.set(drivers);
        this.driversLoading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.driversLoading.set(false);
        this.cdr.detectChanges();
      },
    });

    if (this.userId) {
      this.fantasy.getTeam(this.userId).subscribe(team => {
        if (team) {
          this.pickedIds.set(team.driverIds);
          this.persistedIds.set(team.driverIds);
          this.savedAt.set(team.updatedAt);
        }
        this.cdr.detectChanges();
      });
    }
  }

  setTab(tab: ActiveTab): void {
    this.activeTab = tab;
    if (tab === 'leaderboard') this.loadLeaderboard();
  }

  loadLeaderboard(): void {
    this.leaderboardLoading.set(true);
    this.fantasy.getLeaderboard(this.userId ?? undefined).subscribe({
      next: entries => {
        this.leaderboard.set(entries);
        this.leaderboardLoading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.leaderboardLoading.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Builder actions ─────────────────────────────────────────
  isPicked(driver: FantasyDriver): boolean {
    return this.pickedIds().includes(driver.id);
  }

  canPick(driver: FantasyDriver): boolean {
    return !this.isPicked(driver) && !this.teamFull() && driver.price <= this.remaining();
  }

  pick(driver: FantasyDriver): void {
    if (!this.canPick(driver)) return;
    this.pickedIds.update(ids => [...ids, driver.id]);
    this.saveError.set(null);
  }

  remove(driverId: string): void {
    this.pickedIds.update(ids => ids.filter(id => id !== driverId));
    this.saveError.set(null);
  }

  saveTeam(): void {
    if (!this.userId || !this.teamFull() || this.saving()) return;
    this.saving.set(true);
    this.saveError.set(null);
    this.fantasy.saveTeam(this.userId, { driverIds: this.pickedIds() }).subscribe({
      next: (team: FantasyTeam) => {
        this.persistedIds.set(team.driverIds);
        this.savedAt.set(team.updatedAt);
        this.saving.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.saveError.set('Could not save your team — please try again.');
        this.saving.set(false);
        this.cdr.detectChanges();
      },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────
  getTeamColor(teamName: string | null | undefined): string {
    if (!teamName) return '#E10600';
    return TEAM_COLORS[teamName.toLowerCase()] ?? '#E10600';
  }

  isYou(entry: LeaderboardEntry): boolean {
    return !!this.userId && entry.userId === this.userId;
  }

  trackByDriver(_: number, driver: FantasyDriver): string {
    return driver.id;
  }

  trackByEntry(_: number, entry: LeaderboardEntry): string {
    return entry.userId;
  }

  // Guest preview data (pre-login teaser, blurred behind overlay)
  previewDrivers = [
    { name: 'Max Verstappen', team: 'Red Bull', price: 30.5, points: 245, color: '#4781D7' },
    { name: 'Lando Norris', team: 'McLaren', price: 28.0, points: 230, color: '#F47600' },
    { name: 'Charles Leclerc', team: 'Ferrari', price: 27.5, points: 218, color: '#ED1131' },
    { name: 'George Russell', team: 'Mercedes', price: 24.0, points: 195, color: '#00D7B6' },
    { name: 'Carlos Sainz', team: 'Williams', price: 20.0, points: 170, color: '#1868DB' },
    { name: 'Oscar Piastri', team: 'McLaren', price: 26.5, points: 210, color: '#F47600' },
  ];
}
