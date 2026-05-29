import { Component, ChangeDetectionStrategy, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

type SignupStep = 'register' | 'verify' | 'success';

const F1_TEAMS = [
  { name: 'Ferrari',       color: '#ED1131' },
  { name: 'McLaren',       color: '#F47600' },
  { name: 'Red Bull',      color: '#4781D7' },
  { name: 'Mercedes',      color: '#00D7B6' },
  { name: 'Aston Martin',  color: '#229971' },
  { name: 'Alpine',        color: '#00A1E8' },
  { name: 'Williams',      color: '#1868DB' },
  { name: 'Racing Bulls',  color: '#6C98FF' },
  { name: 'Haas',          color: '#9C9FA2' },
  { name: 'Audi',          color: '#F50537' },
];

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Signup {

  // Form fields
  name          = '';
  email         = '';
  password      = '';
  confirmPassword = '';
  favouriteTeam = '';
  verifyCode    = '';

  // State
  isLoading = signal(false);
  error     = signal<string | null>(null);
  step      = signal<SignupStep>('register');

  teams = F1_TEAMS;

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  selectTeam(team: string): void {
    this.favouriteTeam = team;
  }

  async onRegister(): Promise<void> {
    // Validate
    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }
    if (!this.favouriteTeam) {
      this.error.set('Please select your favourite team');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.cdr.detectChanges();

    try {
      const { nextStep } = await this.authService.register(
        this.email,
        this.password,
        this.name,
        this.favouriteTeam
      );

      if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        this.step.set('verify');  // ← show verification form
      }

    } catch (err: any) {
      this.error.set(err.message || 'Registration failed');
    } finally {
      this.isLoading.set(false);
      this.cdr.detectChanges();
    }
  }

  async onVerify(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.cdr.detectChanges();

    try {
      await this.authService.confirmEmail(this.email, this.verifyCode);
      this.step.set('success');

    } catch (err: any) {
      this.error.set(err.message || 'Verification failed');
    } finally {
      this.isLoading.set(false);
      this.cdr.detectChanges();
    }
  }
}