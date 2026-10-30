import { provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { AuthStateService, BusEventType, EventBusService } from '@f1-racelab/shared-ui';
import { signOut, getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import { NavbarComponent } from './navbar';

jest.mock('aws-amplify', () => ({ Amplify: { configure: jest.fn() } }));
jest.mock('aws-amplify/auth', () => ({
  signOut: jest.fn(), getCurrentUser: jest.fn(), fetchUserAttributes: jest.fn(),
}));

describe('NavbarComponent', () => {
  it('restores the email attribute instead of the opaque Cognito username', async () => {
    const authState = new AuthStateService();
    jest.mocked(getCurrentUser).mockResolvedValue({ username: 'opaque-guest-username', userId: 'guest-id' });
    jest.mocked(fetchUserAttributes).mockResolvedValue({ email: 'guest@f1racelab.com', name: 'Guest' });
    const component = new NavbarComponent(authState, new EventBusService(), {} as Router);

    await component.ngOnInit();

    expect(authState.getUser()?.email).toBe('guest@f1racelab.com');
  });

  it('clears the user and opens sign-in through the router when signing out', async () => {
    const authState = new AuthStateService();
    authState.setUser({ email: 'fan@example.com', name: 'Race fan', favouriteTeam: '' });
    const eventBus = new EventBusService();
    const emit = jest.spyOn(eventBus, 'emit');
    const router = { navigate: jest.fn().mockResolvedValue(true) };
    jest.mocked(signOut).mockResolvedValue(undefined);
    const component = new NavbarComponent(authState, eventBus, router as unknown as Router);
    component.showDropdown = true;

    await component.logout();

    expect(signOut).toHaveBeenCalled();
    expect(authState.isLoggedIn()).toBe(false);
    expect(component.showDropdown).toBe(false);
    expect(emit).toHaveBeenCalledWith(BusEventType.AUTH_LOGOUT, null);
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});

@Component({ standalone: true, template: '' })
class NavigationTestPage {}

describe('Navbar navigation controls', () => {
  beforeEach(async () => {
    jest.mocked(getCurrentUser).mockRejectedValue(new Error('No session'));
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([{ path: 'news', component: NavigationTestPage }])],
    }).compileComponents();
  });

  it('exposes all five routes in an accessible toggle menu and closes on selection', async () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const toggle = root.querySelector<HTMLButtonElement>('.menu-toggle')!;
    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('.tabs a'));

    expect(links.map(link => link.getAttribute('href'))).toEqual(['/predictor', '/live', '/stats', '/fantasy', '/news']);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('primary-navigation');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('.tabs.mobile-open')).not.toBeNull();
    links[4].click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(links[4].getAttribute('aria-current')).toBe('page');
  });

  it('dismisses the mobile menu with Escape and returns keyboard focus to its toggle', async () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    await fixture.whenStable();
    const toggle = fixture.nativeElement.querySelector('.menu-toggle') as HTMLButtonElement;
    const focus = jest.spyOn(toggle, 'focus');
    toggle.click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.mobileMenuOpen()).toBe(false);
    expect(focus).toHaveBeenCalled();
  });

  it('closes on outside clicks and completed route changes', async () => {
    const fixture = TestBed.createComponent(NavbarComponent);
    await fixture.whenStable();
    fixture.componentInstance.toggleNavigation();
    document.body.click();
    expect(fixture.componentInstance.mobileMenuOpen()).toBe(false);
    fixture.componentInstance.toggleNavigation();
    await TestBed.inject(Router).navigateByUrl('/news');
    expect(fixture.componentInstance.mobileMenuOpen()).toBe(false);
  });
});
