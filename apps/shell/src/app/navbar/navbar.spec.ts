import { Router } from '@angular/router';
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
