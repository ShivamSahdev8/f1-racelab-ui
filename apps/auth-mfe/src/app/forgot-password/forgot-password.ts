import { Component, ChangeDetectionStrategy, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

type ResetStep = 'email' | 'code' | 'success';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPassword {

  email       = '';
  code        = '';
  newPassword = '';
  confirmPassword = '';
  isLoading   = signal(false);
  error       = signal<string | null>(null);
  step        = signal<ResetStep>('email');

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  async onSendCode(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.cdr.detectChanges();

    try {
      await this.authService.forgotPassword(this.email);
      this.step.set('code');

    } catch (err: any) {
      this.error.set(err.message || 'Failed to send code');
    } finally {
      this.isLoading.set(false);
      this.cdr.detectChanges();
    }
  }

  async onResetPassword(): Promise<void> {
    if (this.newPassword !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.cdr.detectChanges();

    try {
      await this.authService.confirmForgotPassword(
        this.email,
        this.code,
        this.newPassword
      );
      this.step.set('success');

    } catch (err: any) {
      this.error.set(err.message || 'Failed to reset password');
    } finally {
      this.isLoading.set(false);
      this.cdr.detectChanges();
    }
  }
}