import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, ViewChildren, QueryList
} from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule, AsyncPipe } from '@angular/common';
import { Observable, filter, Subscription } from 'rxjs';
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
export class NavbarComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('pill') pillRef!: ElementRef<HTMLSpanElement>;
  @ViewChildren('tab') tabRefs!: QueryList<ElementRef<HTMLElement>>;

  user$: Observable<AuthUser | null>;
  isLoggedIn$: Observable<boolean>;
  showDropdown = false;

  private routerSub!: Subscription;

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
  }

  ngAfterViewInit(): void {
    // Move pill on route change
    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => setTimeout(() => this.movePill(), 50));
    setTimeout(() => this.movePill(), 100);
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  movePill(): void {
    const active = this.tabRefs?.find(t =>
      t.nativeElement.classList.contains('active')
    );
    const pill = this.pillRef?.nativeElement;
    if (active && pill) {
      pill.style.left = active.nativeElement.offsetLeft + 'px';
      pill.style.width = active.nativeElement.offsetWidth + 'px';
    } else if (pill) {
      pill.style.width = '0';
    }
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
      this.authState.clearUser();
    }
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  async logout(): Promise<void> {
    try {
      await signOut();
    } catch (e) {
      console.error(e);
    }
    this.authState.clearUser();
    this.showDropdown = false;
    window.location.href = '/auth/login';
  }
}