import {
  Component,
  ChangeDetectionStrategy,
  signal,
  ChangeDetectorRef,
  DestroyRef,
  inject,
  effect,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { RouterLink } from '@angular/router';
import { AuthStateService } from '@f1-racelab/shared-ui';
import {
  PredictionService,
  PredictionRequest,
  PredictionResult,
  RaceOverview,
  PredictionAccessError,
} from '@f1-racelab/f1-data-client';
import { F1CarVisualComponent } from '../f1-car-visual/f1-car-visual';
import { CircuitVisual } from '../circuit-visual/circuit-visual';

type ActiveView = 'overview' | 'simulator';

@Component({
  selector: 'app-predictor-preview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    F1CarVisualComponent,
    CircuitVisual,
    DecimalPipe,
    RouterLink,
  ],
  templateUrl: './predictor-preview.html',
  styleUrl: './predictor-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredictorPreview {
  private readonly destroyRef = inject(DestroyRef);
  private readonly destroyed = new Subject<void>();
  readonly isMember = signal(false);
  readonly requiresSignIn;
  predictionRequest: PredictionRequest | null = null;

  // Views
  activeView: ActiveView = 'simulator';

  // Overview state
  overview = signal<RaceOverview | null>(null);
  overviewLoading = signal(false);
  overviewError = signal<string | null>(null);

  // Simulator state
  selectedDriver = '';
  selectedCircuit = '';
  selectedTyres = 'SOFT';
  selectedWeather = 'DRY';
  selectedDownforce = 'HIGH';
  selectedStrategy = '1-STOP';
  isLoading = signal(false);
  prediction = signal<PredictionResult | null>(null);
  error = signal<string | null>(null);

  // Options
  drivers = [
    'Max Verstappen',
    'Lando Norris',
    'Charles Leclerc',
    'George Russell',
    'Carlos Sainz',
    'Oscar Piastri',
    'Lewis Hamilton',
    'Fernando Alonso',
    'Lance Stroll',
    'Kimi Antonelli',
    'Pierre Gasly',
    'Esteban Ocon',
    'Alexander Albon',
    'Nico Hulkenberg',
    'Valtteri Bottas',
    'Sergio Perez',
    'Oliver Bearman',
    'Franco Colapinto',
    'Liam Lawson',
    'Isack Hadjar',
  ];

  circuits = [
    'Bahrain',
    'Saudi Arabia',
    'Australia',
    'Japan',
    'China',
    'Miami',
    'Emilia Romagna',
    'Monaco',
    'Canada',
    'Barcelona',
    'Austria',
    'Great Britain',
    'Hungary',
    'Belgium',
    'Netherlands',
    'Italy',
    'Azerbaijan',
    'Singapore',
    'United States',
    'Mexico',
    'Brazil',
    'Las Vegas',
    'Qatar',
    'Abu Dhabi',
  ];

  tyreOptions = ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'];
  weatherOptions = ['DRY', 'DAMP', 'WET'];
  downforceOptions = ['LOW', 'MEDIUM', 'HIGH'];
  strategyOptions = ['1-STOP', '2-STOP', '3-STOP'];

  private teamColors: Record<string, string> = {
    'Red Bull Racing': '#4781D7',
    'Red Bull': '#4781D7',
    McLaren: '#F47600',
    Ferrari: '#ED1131',
    Mercedes: '#00D7B6',
    'Aston Martin': '#229971',
    Alpine: '#00A1E8',
    Williams: '#1868DB',
    'Racing Bulls': '#6C98FF',
    'Haas F1 Team': '#9C9FA2',
    Audi: '#F50537',
    Cadillac: '#909090',
  };

  constructor(
    private authState: AuthStateService,
    private predictionService: PredictionService,
    private cdr: ChangeDetectorRef,
  ) {
    this.destroyRef.onDestroy(() => {
      this.destroyed.next();
      this.destroyed.complete();
    });
    this.authState.isLoggedIn$.pipe(takeUntil(this.destroyed)).subscribe(() => {
      this.isMember.set(this.predictionService.isMember());
    });
    this.requiresSignIn = () =>
      !this.isMember() && this.predictionService.requiresSignIn();
    const saved = this.predictionService.getGuestPrediction();
    if (saved) {
      this.selectedDriver = saved.request.driver;
      this.selectedCircuit = saved.request.circuit;
      this.selectedTyres = saved.request.tyres;
      this.selectedWeather = saved.request.weather;
      this.selectedDownforce = saved.request.downforce;
      this.selectedStrategy = saved.request.strategy;
      this.predictionRequest = saved.request;
      this.prediction.set(saved.result);
    }
    // Reattach to the original guest request if the user leaves and returns.
    effect(() => {
      const guest = this.predictionService.guestRequestState();
      if (this.isMember() || !guest.request) return;
      this.selectedDriver = guest.request.driver;
      this.selectedCircuit = guest.request.circuit;
      this.selectedTyres = guest.request.tyres;
      this.selectedWeather = guest.request.weather;
      this.selectedDownforce = guest.request.downforce;
      this.selectedStrategy = guest.request.strategy;
      this.predictionRequest = guest.request;
      this.isLoading.set(guest.loading);
      this.prediction.set(guest.result);
      this.error.set(guest.error ? this.predictionError(
        guest.error, 'Unable to complete this prediction. Sign in to continue.'
      ) : null);
    });
  }

  loadOverview(): void {
    if (!this.isMember() || this.overviewLoading()) return;
    this.overviewLoading.set(true);
    this.overviewError.set(null);

    this.predictionService
      .getOverview()
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: (data) => {
          this.overview.set(data);
          this.overviewLoading.set(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.overviewError.set(
            this.predictionError(
              err,
              'Unable to load the race overview. Please try again later.',
            ),
          );
          this.overviewLoading.set(false);
          this.cdr.detectChanges();
        },
      });
  }

  setView(view: ActiveView): void {
    this.activeView = view;
    this.cdr.markForCheck();
  }

  getTeamColor(team: string): string {
    return this.teamColors[team] || '#888';
  }

  getFormColor(form: string): string {
    const colors: Record<string, string> = {
      HOT: '#e10600',
      GOOD: '#00c800',
      AVERAGE: '#ffd700',
      COLD: '#4781D7',
    };
    return colors[form] || '#888';
  }

  getFormEmoji(form: string): string {
    const emojis: Record<string, string> = {
      HOT: '🔥',
      GOOD: '✅',
      AVERAGE: '➡️',
      COLD: '🧊',
    };
    return emojis[form] || '➡️';
  }

  onPredict(): void {
    if (this.isLoading() || this.requiresSignIn()) return;
    if (!this.selectedDriver || !this.selectedCircuit) {
      this.error.set('Please select a driver and circuit');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.prediction.set(null);
    this.cdr.detectChanges();

    const request: PredictionRequest = {
      driver: this.selectedDriver,
      circuit: this.selectedCircuit,
      tyres: this.selectedTyres,
      weather: this.selectedWeather,
      downforce: this.selectedDownforce,
      strategy: this.selectedStrategy,
    };
    this.predictionService
      .predict(request)
      .pipe(takeUntil(this.destroyed))
      .subscribe({
        next: (result) => {
          this.predictionRequest = request;
          this.prediction.set(result);
          this.isLoading.set(false);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error.set(
            this.predictionError(
              err,
              'Unable to complete this prediction. Sign in to continue if your guest trial has been used.',
            ),
          );
          this.isLoading.set(false);
          this.cdr.detectChanges();
        },
      });
  }

  private predictionError(error: unknown, fallback: string): string {
    return error instanceof PredictionAccessError ? error.message : fallback;
  }

  getRiskColor(risk: string): string {
    return { 'LOW': '#00c800', 'MEDIUM': '#ffd700', 'HIGH': '#e10600' }[risk] || '#888';
  }

  getWinChanceColor(chance: number): string {
    if (chance >= 60) return '#00c800';
    if (chance >= 30) return '#ffd700';
    return '#e10600';
  }

  getTyreEmoji(tyre: string): string {
    return { 'SOFT': '🔴', 'MEDIUM': '🟡', 'HARD': '⚪', 'INTERMEDIATE': '🟢', 'WET': '🔵' }[tyre] || '⚪';
  }

  private raceNameMap: Record<string, string> = {
  'Canadian Grand Prix': 'Canada',
  'Monaco Grand Prix': 'Monaco',
  'Italian Grand Prix': 'Italy',
  'British Grand Prix': 'Great Britain',
  'Japanese Grand Prix': 'Japan',
  'Australian Grand Prix': 'Australia',
  'Bahrain Grand Prix': 'Bahrain',
  'Spanish Grand Prix': 'Spain',
  'Barcelona Grand Prix': 'Barcelona',
  'Austrian Grand Prix': 'Austria',
  'Belgian Grand Prix': 'Belgium',
  'Dutch Grand Prix': 'Netherlands',
  'Hungarian Grand Prix': 'Hungary',
  'Azerbaijan Grand Prix': 'Azerbaijan',
  'Singapore Grand Prix': 'Singapore',
  'United States Grand Prix': 'United States',
  'Mexico City Grand Prix': 'Mexico',
  'São Paulo Grand Prix': 'Brazil',
  'Abu Dhabi Grand Prix': 'Abu Dhabi',
  'Saudi Arabian Grand Prix': 'Saudi Arabia',
  'Miami Grand Prix': 'Miami',
  'Las Vegas Grand Prix': 'Las Vegas',
  'Qatar Grand Prix': 'Qatar',
  'Chinese Grand Prix': 'China',
  'Emilia Romagna Grand Prix': 'Emilia Romagna',
};

getRaceCircuit(raceName: string): string {
  return this.raceNameMap[raceName] || '';
}
private driverTeamMap: Record<string, string> = {
  'Max Verstappen': '#4781D7',
  'Isack Hadjar': '#4781D7',
  'Lando Norris': '#F47600',
  'Oscar Piastri': '#F47600',
  'Charles Leclerc': '#ED1131',
  'Lewis Hamilton': '#ED1131',
  'George Russell': '#00D7B6',
  'Kimi Antonelli': '#00D7B6',
  'Fernando Alonso': '#229971',
  'Lance Stroll': '#229971',
  'Pierre Gasly': '#00A1E8',
  'Franco Colapinto': '#00A1E8',
  'Alexander Albon': '#1868DB',
  'Carlos Sainz': '#1868DB',
  'Nico Hulkenberg': '#F50537',
  'Gabriel Bortoleto': '#F50537',
  'Liam Lawson': '#6C98FF',
  'Arvid Lindblad': '#6C98FF',
  'Esteban Ocon': '#9C9FA2',
  'Oliver Bearman': '#9C9FA2',
  'Valtteri Bottas': '#909090',
  'Sergio Perez': '#909090',
};

getDriverTeamColor(driver: string): string {
  return this.driverTeamMap[driver] || '#e10600';
}
}