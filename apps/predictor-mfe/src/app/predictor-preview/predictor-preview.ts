import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthStateService, AuthUser } from '@f1-racelab/shared-ui';

@Component({
  selector: 'app-predictor-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './predictor-preview.html',
  styleUrl: './predictor-preview.css'
})
export class PredictorPreview {

  isLoggedIn$: Observable<boolean>;
  user$: Observable<AuthUser | null>;

  upcomingRace = {
    name: 'Monaco Grand Prix',
    circuit: 'Circuit de Monaco',
    date: 'May 25, 2026',
    round: 7,
    flag: '🇲🇨'
  };

  previewPredictions = [
    { position: 1, driver: 'Max Verstappen', team: 'Red Bull', odds: '2.5', color: '#4781D7' },
    { position: 2, driver: 'Charles Leclerc', team: 'Ferrari', odds: '3.0', color: '#ED1131' },
    { position: 3, driver: 'Lando Norris', team: 'McLaren', odds: '4.5', color: '#F47600' },
    { position: 4, driver: 'George Russell', team: 'Mercedes', odds: '6.0', color: '#00D7B6' },
    { position: 5, driver: 'Oscar Piastri', team: 'McLaren', odds: '7.5', color: '#F47600' },
  ];

  communityStats = {
    totalPredictions: 12450,
    accuracy: 34,
    topPredictor: 'RaceFan2026'
  };

  constructor(private authState: AuthStateService) {
    this.isLoggedIn$ = this.authState.isLoggedIn$;
    this.user$ = this.authState.user$;
  }
}