import { Injectable } from '@angular/core';
import {
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  confirmSignIn,
  resetPassword,
  confirmResetPassword,
  getCurrentUser,
  fetchUserAttributes
} from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import { cognitoConfig } from './cognito.config';

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor() {
    Amplify.configure(cognitoConfig);
  }

  // ── Login ────────────────────────────────────────────
  async login(email: string, password: string) {
    await signOut().catch(() => {}); // clear existing session
    return await signIn({ username: email, password });
  }

  // ── Register ─────────────────────────────────────────
  async register(
    email: string,
    password: string,
    name: string,
    favouriteTeam: string
  ) {
    return await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          name,
          'custom:favouriteTeam': favouriteTeam
        }
      }
    });
  }

  // ── Confirm Email ────────────────────────────────────
  async confirmEmail(email: string, code: string) {
    return await confirmSignUp({ username: email, confirmationCode: code });
  }

  // ── Confirm New Password ─────────────────────────────
  async confirmNewPassword(newPassword: string, name: string) {
    return await confirmSignIn({
      challengeResponse: newPassword,
      options: { userAttributes: { name } }
    });
  }

  // ── Forgot Password ──────────────────────────────────
  async forgotPassword(email: string) {
    return await resetPassword({ username: email });
  }

  // ── Confirm Password Reset ───────────────────────────
  async confirmForgotPassword(
    email: string,
    code: string,
    newPassword: string
  ) {
    return await confirmResetPassword({
      username: email,
      confirmationCode: code,
      newPassword
    });
  }

  // ── Logout ───────────────────────────────────────────
  async logout() {
    return await signOut();
  }

  // ── Get Current User ─────────────────────────────────
  async getCurrentUser() {
    try {
      return await getCurrentUser();
    } catch {
      return null;
    }
  }

  // ── Get User Attributes ──────────────────────────────
  async getUserAttributes() {
    try {
      return await fetchUserAttributes();
    } catch {
      return null;
    }
  }

  // ── Is Logged In ─────────────────────────────────────
  async isLoggedIn(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  }
}