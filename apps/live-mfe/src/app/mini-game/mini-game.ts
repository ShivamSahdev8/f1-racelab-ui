import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { advanceRace, createRace, PLAYER_Y, raceSpeed } from './race-game';
import { ARCADE_TEAMS } from './race-roster';

type GameStatus = 'ready' | 'racing' | 'paused' | 'crashed';

@Component({
  selector: 'app-mini-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mini-game.html',
  styleUrl: './mini-game.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiniGameComponent implements OnDestroy {
  @ViewChild('arena') private arena?: ElementRef<HTMLElement>;
  readonly race = signal(createRace());
  readonly status = signal<GameStatus>('ready');
  readonly distance = computed(() => Math.floor(this.race().distance));
  readonly speed = computed(() => Math.round(raceSpeed(this.race().elapsed) * 1.15));
  readonly playerY = PLAYER_Y;
  readonly teams = ARCADE_TEAMS;
  readonly teamId = signal(ARCADE_TEAMS[0].id);
  readonly driverId = signal(ARCADE_TEAMS[0].drivers[0].id);
  readonly selectedTeam = computed(() => this.teams.find(team => team.id === this.teamId())!);
  readonly selectedDriver = computed(() => this.selectedTeam().drivers.find(driver => driver.id === this.driverId())!);
  readonly canSelectSeat = computed(() => this.status() === 'ready' || this.status() === 'crashed');
  best = 0;
  private left = false;
  private right = false;
  private frame?: number;
  private lastTime = 0;

  selectTeam(id: string): void {
    if (!this.canSelectSeat()) return;
    const team = this.teams.find(team => team.id === id);
    if (!team || team.id === this.teamId()) return;
    this.teamId.set(team.id);
    this.driverId.set(team.drivers[0].id);
  }

  selectDriver(id: string): void {
    if (this.canSelectSeat() && this.selectedTeam().drivers.some(driver => driver.id === id)) {
      this.driverId.set(id);
    }
  }

  returnToGarage(): void {
    this.stopFrame();
    this.left = this.right = false;
    this.race.set(createRace());
    this.status.set('ready');
  }

  start(): void {
    this.stopFrame();
    this.race.set(createRace());
    this.left = this.right = false;
    this.status.set('racing');
    this.arena?.nativeElement.focus({ preventScroll: true });
    this.scheduleFrame();
  }

  pause(): void {
    if (this.status() !== 'racing') return;
    this.status.set('paused');
    this.left = this.right = false;
    this.stopFrame();
  }

  resume(): void {
    if (this.status() !== 'paused') return;
    this.status.set('racing');
    this.arena?.nativeElement.focus({ preventScroll: true });
    this.scheduleFrame();
  }

  keyDown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      if (this.status() !== 'racing') return;
      event.preventDefault();
      if (event.key === 'ArrowLeft') this.left = true;
      else this.right = true;
    } else if (event.key === 'Escape' && this.status() === 'racing') {
      event.preventDefault();
      this.pause();
    }
  }

  keyUp(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') this.left = false;
    if (event.key === 'ArrowRight') this.right = false;
  }

  steer(direction: 'left' | 'right', pressed: boolean, event?: PointerEvent): void {
    if (pressed && this.status() !== 'racing') return;
    if (pressed && event) (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    if (direction === 'left') this.left = pressed;
    else this.right = pressed;
  }

  focusOut(event: FocusEvent): void {
    const section = event.currentTarget as HTMLElement;
    if (!section.contains(event.relatedTarget as Node | null)) this.pause();
  }

  @HostListener('window:blur') windowBlur(): void { this.pause(); }
  @HostListener('document:visibilitychange') visibilityChanged(): void {
    if (document.hidden) this.pause();
  }

  ngOnDestroy(): void { this.stopFrame(); }

  private scheduleFrame(): void {
    this.lastTime = 0;
    this.frame = requestAnimationFrame(time => this.tick(time));
  }

  private tick(time: number): void {
    if (this.status() !== 'racing') return;
    const dt = this.lastTime ? (time - this.lastTime) / 1000 : 0;
    this.lastTime = time;
    const next = advanceRace(this.race(), dt, Number(this.right) - Number(this.left));
    this.race.set(next);
    if (next.crashed) {
      this.best = Math.max(this.best, Math.floor(next.distance));
      this.status.set('crashed');
      this.left = this.right = false;
      this.frame = undefined;
      return;
    }
    this.frame = requestAnimationFrame(nextTime => this.tick(nextTime));
  }

  private stopFrame(): void {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.lastTime = 0;
  }
}
