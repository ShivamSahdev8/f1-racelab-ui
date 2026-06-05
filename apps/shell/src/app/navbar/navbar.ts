import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthStateService, AuthUser, EventBusService, BusEventType, cognitoConfig } from '@f1-racelab/shared-ui';
import { signOut, getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, AsyncPipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent implements OnInit {

  user$: Observable<AuthUser | null>;
  isLoggedIn$: Observable<boolean>;
  showDropdown = false;
  private inactivityTimer: any;
  private readonly TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  constructor(
    private authState: AuthStateService,
    private eventBus: EventBusService,
    private router: Router
  ) {
    Amplify.configure(cognitoConfig);
    this.user$ = this.authState.user$;
    this.isLoggedIn$ = this.authState.isLoggedIn$;
  }

  async ngOnInit(): Promise<void> {
    await this.restoreSession();
      // Reset timer on user activity
  ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
    document.addEventListener(event, () => this.resetInactivityTimer());
  });

  this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
  clearTimeout(this.inactivityTimer);
  this.inactivityTimer = setTimeout(() => {
    this.logout();
  }, this.TIMEOUT_MS);
}

  private async restoreSession(): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (user) {
        const attrs = await fetchUserAttributes();
        this.authState.setUser({
          email: user.username,
          name: attrs?.['name'] ?? user.username,
          favouriteTeam: attrs?.['custom:favouriteTeam'] ?? ''
        });
      }
    } catch {
      // No existing session — show login button
      this.authState.clearUser();
    }
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  async logout(): Promise<void> {
    try {
      Amplify.configure(cognitoConfig);
      await signOut();
    } catch (e) {
      console.error('Signout error:', e);
    }
    this.authState.clearUser();
    this.eventBus.emit(BusEventType.AUTH_LOGOUT, null);
    this.showDropdown = false;
    window.location.href = '/auth/login';
  }
}