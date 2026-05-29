import { Injectable } from '@angular/core';
import {
  signIn, signUp, signOut, confirmSignUp, confirmSignIn,
  resetPassword, confirmResetPassword, getCurrentUser, fetchUserAttributes
} from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import { cognitoConfig } from '@f1-racelab/shared-ui';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private ensureConfigured(): void {
    Amplify.configure(cognitoConfig);
  }

async login(email: string, password: string) {
  console.log('1. About to configure Amplify');
  Amplify.configure(cognitoConfig);
  console.log('2. Amplify configured');
  console.log('3. Amplify config check:', Amplify.getConfig());
  
  try {
    await signOut().catch(() => {});
    console.log('4. Previous session cleared');
  } catch (e) {
    console.log('4. No previous session');
  }

  console.log('5. About to signIn with:', email);
  return await signIn({ username: email, password });
}

  async register(email: string, password: string, name: string, favouriteTeam: string) {
    this.ensureConfigured();
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

  async confirmEmail(email: string, code: string) {
    this.ensureConfigured();
    return await confirmSignUp({ username: email, confirmationCode: code });
  }

  async confirmNewPassword(newPassword: string, name: string) {
    this.ensureConfigured();
    return await confirmSignIn({
      challengeResponse: newPassword,
      options: { userAttributes: { name } }
    });
  }

  async forgotPassword(email: string) {
    this.ensureConfigured();
    return await resetPassword({ username: email });
  }

  async confirmForgotPassword(email: string, code: string, newPassword: string) {
    this.ensureConfigured();
    return await confirmResetPassword({
      username: email,
      confirmationCode: code,
      newPassword
    });
  }

  async logout() {
    this.ensureConfigured();
    return await signOut();
  }

  async getCurrentUser() {
    this.ensureConfigured();
    try {
      return await getCurrentUser();
    } catch {
      return null;
    }
  }

  async getUserAttributes() {
    this.ensureConfigured();
    try {
      return await fetchUserAttributes();
    } catch {
      return null;
    }
  }

  async isLoggedIn(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  }
}