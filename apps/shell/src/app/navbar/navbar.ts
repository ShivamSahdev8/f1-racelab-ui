import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { AuthStateService, AuthUser, EventBusService, BusEventType, cognitoConfig } from '@f1-racelab/shared-ui';
import { signOut } from 'aws-amplify/auth';


@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, AsyncPipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent {

  user$: Observable<AuthUser | null>;
  isLoggedIn$: Observable<boolean>;
  showDropdown = false;

  constructor(
    private authState: AuthStateService,
    private eventBus: EventBusService,
    private router: Router
  ) {
   
    this.user$ = this.authState.user$;
    this.isLoggedIn$ = this.authState.isLoggedIn$;
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  async logout(): Promise<void> {
    try {
      await signOut();
    } catch (e) {
      console.error('Signout error:', e);
    }
    this.authState.clearUser();
    this.eventBus.emit(BusEventType.AUTH_LOGOUT, null);
    this.showDropdown = false;
    this.router.navigate(['/auth/login']);
    window.location.reload();
  }
}