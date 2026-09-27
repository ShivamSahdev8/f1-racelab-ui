import { Component, ChangeDetectionStrategy, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { AuthStateService, EventBusService } from '@f1-racelab/shared-ui';
import { BusEventType } from '@f1-racelab/shared-ui';
import { Router, RouterLink } from '@angular/router';

type AuthStep = 'login' | 'new-password' | 'success';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login {

  email       = '';
  password    = '';
  newPassword = '';
  name        = '';
  isLoading   = signal(false);
  error       = signal<string | null>(null);
  step        = signal<AuthStep>('login');
  showPassword = signal(false);
  constructor(
    private authService: AuthService,
    private eventBus: EventBusService,
    private authState: AuthStateService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    this.checkExistingSession();
  }

  async checkExistingSession(): Promise<void> {
    const user = await this.authService.getCurrentUser();
    if (user) {
      const attrs = await this.authService.getUserAttributes();
      const email = attrs?.['email'] ?? user.username;
      if (email.trim().toLowerCase() === 'guest@f1racelab.com') {
        this.authState.clearUser();
        this.step.set('login');
        this.isLoading.set(true);
        try {
          await this.authService.logout();
        } catch {
          this.error.set('Please sign in with your own account to continue.');
        } finally {
          this.eventBus.emit(BusEventType.AUTH_LOGOUT, null);
          this.isLoading.set(false);
          this.cdr.markForCheck();
        }
        return;
      }
      this.authState.setUser({
        email,
        name: attrs?.['name'] ?? user.username,
        favouriteTeam: attrs?.['custom:favouriteTeam'] ?? ''
      });
      this.step.set('success');
      this.eventBus.emit(BusEventType.AUTH_SUCCESS, email);
      this.cdr.markForCheck();
      await this.router.navigate(['/predictor']);
    }
  }

  async onLogin(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.cdr.markForCheck();

    try {
      const { isSignedIn, nextStep } = await this.authService.login(
        this.email,
        this.password
      );

      if (isSignedIn) {
        const attrs = await this.authService.getUserAttributes();
        this.authState.setUser({
          email: this.email,
          name: attrs?.['name'] ?? this.email,
          favouriteTeam: attrs?.['custom:favouriteTeam'] ?? ''
        });
        this.step.set('success');
        this.eventBus.emit(BusEventType.AUTH_SUCCESS, this.email);
        await this.router.navigate(['/predictor']);
      } else if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        this.step.set('new-password');
      }

    } catch (err: any) {
      this.error.set(err.message || 'Login failed');
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  async onSetNewPassword(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.cdr.markForCheck();

    try {
      const { isSignedIn } = await this.authService.confirmNewPassword(
        this.newPassword,
        this.name
      );

      if (isSignedIn) {
        this.authState.setUser({
          email: this.email,
          name: this.name,
          favouriteTeam: ''
        });
        this.step.set('success');
        this.eventBus.emit(BusEventType.AUTH_SUCCESS, this.email);
        await this.router.navigate(['/predictor']);

      }

    } catch (err: any) {
      this.error.set(err.message || 'Failed to set new password');
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  async onLogout(): Promise<void> {
    await this.authService.logout();
    this.authState.clearUser();
    this.eventBus.emit(BusEventType.AUTH_LOGOUT, null);
    this.step.set('login');
    this.email = '';
    this.password = '';
    this.cdr.markForCheck();
    
  }

  async tryAsGuest(): Promise<void> {
    await this.router.navigate(['/predictor']);
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }
}
