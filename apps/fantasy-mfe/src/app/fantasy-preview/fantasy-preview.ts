import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthStateService, AuthUser } from '@f1-racelab/shared-ui';

@Component({
  selector: 'app-fantasy-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fantasy-preview.html',
  styleUrl: './fantasy-preview.css'
})
export class FantasyPreview {

  isLoggedIn$: Observable<boolean>;
  user$: Observable<AuthUser | null>;

  previewDrivers = [
    { name: 'Max Verstappen', team: 'Red Bull', price: 30.5, points: 245, color: '#4781D7' },
    { name: 'Lando Norris', team: 'McLaren', price: 28.0, points: 230, color: '#F47600' },
    { name: 'Charles Leclerc', team: 'Ferrari', price: 27.5, points: 218, color: '#ED1131' },
    { name: 'George Russell', team: 'Mercedes', price: 24.0, points: 195, color: '#00D7B6' },
    { name: 'Carlos Sainz', team: 'Williams', price: 20.0, points: 170, color: '#1868DB' },
    { name: 'Oscar Piastri', team: 'McLaren', price: 26.5, points: 210, color: '#F47600' },
  ];

  constructor(private authState: AuthStateService) {
    this.isLoggedIn$ = this.authState.isLoggedIn$;
    this.user$ = this.authState.user$;
  }
}