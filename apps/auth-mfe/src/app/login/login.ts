import { Component, ChangeDetectionStrategy, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { signIn, confirmSignIn } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import { cognitoConfig } from '../cognito.config';
import { EventBusService } from '@f1-racelab/shared-ui';
import { BusEventType } from '@f1-racelab/shared-ui';

type AuthStep = 'login' | 'new-password' | 'success';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login {

  email       = '';
  password    = '';
  newPassword = '';
  name = '';
  isLoading   = signal(false);
  error       = signal<string | null>(null);
  step        = signal<AuthStep>('login');

  constructor(
    private eventBus: EventBusService,
    private cdr: ChangeDetectorRef
  ) {
    Amplify.configure(cognitoConfig);
  }

  async onLogin(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.cdr.detectChanges();

    try {
      const { isSignedIn, nextStep } = await signIn({
        username: this.email,
        password: this.password
      });

      if (isSignedIn) {
        this.step.set('success');
        this.eventBus.emit(BusEventType.AUTH_SUCCESS, this.email);
      } else if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        this.step.set('new-password');  // ← show new password form
      }

    } catch (err: any) {
      this.error.set(err.message || 'Login failed');
    } finally {
      this.isLoading.set(false);
      this.cdr.detectChanges();
    }
  }

  async onSetNewPassword(): Promise<void> {
  this.isLoading.set(true);
  this.error.set(null);
  this.cdr.detectChanges();

  try {
    const { isSignedIn } = await confirmSignIn({
      challengeResponse: this.newPassword,
      options: {
        userAttributes: {
          name: this.email  // ← use email as name for now
        }
      }
    });

    if (isSignedIn) {
      this.step.set('success');
      this.eventBus.emit(BusEventType.AUTH_SUCCESS, this.email);
    }

  } catch (err: any) {
    this.error.set(err.message || 'Failed to set new password');
  } finally {
    this.isLoading.set(false);
    this.cdr.detectChanges();
  }
}

  showSignup(): void {
    this.eventBus.emit(BusEventType.AUTH_SUCCESS, 'show-signup');
  }
}