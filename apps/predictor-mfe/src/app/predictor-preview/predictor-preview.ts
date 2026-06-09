import { Component, ChangeDetectionStrategy, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { AuthStateService, AuthUser } from '@f1-racelab/shared-ui';
import {
  PredictionService,
  PredictionRequest,
  PredictionResult,
  RaceOverview,
  Contender
} from '@f1-racelab/f1-data-client';
import { F1CarVisualComponent } from '../f1-car-visual/f1-car-visual';
import { CircuitVisual } from '../circuit-visual/circuit-visual';

type ActiveView = 'overview' | 'simulator';

@Component({
  selector: 'app-predictor-preview',
  standalone: true,
  imports: [CommonModule, FormsModule, F1CarVisualComponent, CircuitVisual, DecimalPipe],
  templateUrl: './predictor-preview.html',
  styleUrl: './predictor-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PredictorPreview {

  isLoggedIn$: Observable<boolean>;
  user$: Observable<AuthUser | null>;

  // Views
  activeView: ActiveView = 'overview';

  // Overview state
  overview = signal<RaceOverview | null>(null);
  overviewLoading = signal(true);
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
    'Max Verstappen', 'Lando Norris', 'Charles Leclerc',
    'George Russell', 'Carlos Sainz', 'Oscar Piastri',
    'Lewis Hamilton', 'Fernando Alonso', 'Lance Stroll',
    'Kimi Antonelli', 'Pierre Gasly', 'Esteban Ocon',
    'Alexander Albon', 'Nico Hulkenberg', 'Valtteri Bottas',
    'Sergio Perez', 'Oliver Bearman', 'Franco Colapinto',
    'Liam Lawson', 'Isack Hadjar'
  ];

  circuits = [
    'Bahrain', 'Saudi Arabia', 'Australia', 'Japan',
    'China', 'Miami', 'Emilia Romagna', 'Monaco',
    'Canada', 'Barcelona', 'Austria', 'Great Britain',
    'Hungary', 'Belgium', 'Netherlands', 'Italy',
    'Azerbaijan', 'Singapore', 'United States', 'Mexico',
    'Brazil', 'Las Vegas', 'Qatar', 'Abu Dhabi'
  ];

  tyreOptions = ['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'];
  weatherOptions = ['DRY', 'DAMP', 'WET'];
  downforceOptions = ['LOW', 'MEDIUM', 'HIGH'];
  strategyOptions = ['1-STOP', '2-STOP', '3-STOP'];

  // Guest preview data
  previewPredictions = [
    { position: 1, driver: 'Max Verstappen', team: 'Red Bull', odds: '2.5', color: '#4781D7' },
    { position: 2, driver: 'Charles Leclerc', team: 'Ferrari', odds: '3.0', color: '#ED1131' },
    { position: 3, driver: 'Lando Norris', team: 'McLaren', odds: '4.5', color: '#F47600' },
    { position: 4, driver: 'George Russell', team: 'Mercedes', odds: '6.0', color: '#00D7B6' },
    { position: 5, driver: 'Oscar Piastri', team: 'McLaren', odds: '7.5', color: '#F47600' },
  ];

  communityStats = { totalPredictions: 12450, accuracy: 34, topPredictor: 'RaceFan2026' };
  upcomingRace = { name: 'Monaco Grand Prix', circuit: 'Circuit de Monaco', date: 'May 25, 2026', round: 7, flag: '🇲🇨' };

  private teamColors: Record<string, string> = {
    'Red Bull Racing': '#4781D7', 'Red Bull': '#4781D7',
    'McLaren': '#F47600', 'Ferrari': '#ED1131',
    'Mercedes': '#00D7B6', 'Aston Martin': '#229971',
    'Alpine': '#00A1E8', 'Williams': '#1868DB',
    'Racing Bulls': '#6C98FF', 'Haas F1 Team': '#9C9FA2',
    'Audi': '#F50537', 'Cadillac': '#909090',
  };

  constructor(
    private authState: AuthStateService,
    private predictionService: PredictionService,
    private cdr: ChangeDetectorRef
  ) {
    this.isLoggedIn$ = this.authState.isLoggedIn$;
    this.user$ = this.authState.user$;
    this.loadOverview();
  }

  loadOverview(): void {
    this.overviewLoading.set(true);
    this.overviewError.set(null);
    //this.cdr.detectChanges();

    this.predictionService.getOverview().subscribe({
      next: (data) => {
        this.overview.set(data);
        this.overviewLoading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.overviewError.set('Failed to load race overview');
        this.overviewLoading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  setView(view: ActiveView): void {
    this.activeView = view;
  }

  getTeamColor(team: string): string {
    return this.teamColors[team] || '#888';
  }

  getFormColor(form: string): string {
    const colors: Record<string, string> = {
      'HOT': '#e10600', 'GOOD': '#00c800', 'AVERAGE': '#ffd700', 'COLD': '#4781D7'
    };
    return colors[form] || '#888';
  }

  getFormEmoji(form: string): string {
    const emojis: Record<string, string> = {
      'HOT': '🔥', 'GOOD': '✅', 'AVERAGE': '➡️', 'COLD': '🧊'
    };
    return emojis[form] || '➡️';
  }

  async onPredict(): Promise<void> {
    if (!this.selectedDriver || !this.selectedCircuit) {
      this.error.set('Please select a driver and circuit');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.prediction.set(null);
    this.cdr.detectChanges();

    this.predictionService.predict({
      driver: this.selectedDriver,
      circuit: this.selectedCircuit,
      tyres: this.selectedTyres,
      weather: this.selectedWeather,
      downforce: this.selectedDownforce,
      strategy: this.selectedStrategy
    }).subscribe({
      next: (result) => {
        this.prediction.set(result);
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.error.set('Failed to get prediction');
        this.isLoading.set(false);
        this.cdr.detectChanges();
      }
    });
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