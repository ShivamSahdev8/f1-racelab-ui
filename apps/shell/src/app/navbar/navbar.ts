import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, ViewChildren, QueryList, HostListener, signal
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
  @ViewChild('navigation') navigationRef?: ElementRef<HTMLElement>;
  @ViewChild('menuToggle') menuToggleRef?: ElementRef<HTMLButtonElement>;

  user$: Observable<AuthUser | null>;
  isLoggedIn$: Observable<boolean>;
  showDropdown = false;
  readonly mobileMenuOpen = signal(false);

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
    ).subscribe(() => {
      this.mobileMenuOpen.set(false);
      this.showDropdown = false;
      setTimeout(() => this.movePill(), 50);
    });
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

  toggleNavigation(): void {
    this.mobileMenuOpen.update(open => !open);
    this.showDropdown = false;
  }

  closeNavigation(): void {
    this.mobileMenuOpen.set(false);
  }

  @HostListener('window:resize') onResize(): void { this.movePill(); }

  @HostListener('document:keydown.escape') closeMenus(): void {
    const restoreMenuFocus = this.mobileMenuOpen();
    this.mobileMenuOpen.set(false);
    this.showDropdown = false;
    if (restoreMenuFocus) this.menuToggleRef?.nativeElement.focus();
  }

  @HostListener('document:click', ['$event']) closeOutside(event: MouseEvent): void {
    if (!this.navigationRef?.nativeElement.contains(event.target as Node)) {
      this.mobileMenuOpen.set(false);
      this.showDropdown = false;
    }
  }

  private async restoreSession(): Promise<void> {
    try {
      const user = await getCurrentUser();
      if (user) {
        const attrs = await fetchUserAttributes();
        this.authState.setUser({
          email: attrs?.['email'] ?? user.username,
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
    this.mobileMenuOpen.set(false);
  }

  async logout(): Promise<void> {
    try {
      await signOut();
    } catch (e) {
      console.error(e);
    }
    this.authState.clearUser();
    this.showDropdown = false;
    this.eventBus.emit(BusEventType.AUTH_LOGOUT, null);
    await this.router.navigate(['/auth/login']);
  }
}
