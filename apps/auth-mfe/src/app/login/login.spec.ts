import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthStateService, BusEventType, EventBusService } from '@f1-racelab/shared-ui';
import { AuthService } from '../auth.service';
import { Login } from './login';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let navigate: jest.SpyInstance;
  const authService = {
    getCurrentUser: jest.fn(),
    getUserAttributes: jest.fn(),
    login: jest.fn(),
    confirmNewPassword: jest.fn(),
    logout: jest.fn(),
  };
  const authState = { setUser: jest.fn(), clearUser: jest.fn() };
  const eventBus = { emit: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    authService.getCurrentUser.mockResolvedValue(null);
    authService.getUserAttributes.mockResolvedValue({ name: 'Race fan' });
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: AuthStateService, useValue: authState },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compileComponents();

    navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('opens the anonymous prediction from the guest button without signing in', async () => {
    component.email = 'fan@example.com';
    component.password = 'user-entered-password';

    fixture.nativeElement.querySelector('.guest-btn').click();
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/predictor']);
    expect(authService.login).not.toHaveBeenCalled();
    expect(authState.setUser).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
    expect(component.email).toBe('fan@example.com');
    expect(component.password).toBe('user-entered-password');
  });

  it('returns a successful sign-in to prediction through Angular routing', async () => {
    authService.login.mockResolvedValue({ isSignedIn: true, nextStep: { signInStep: 'DONE' } });
    component.email = 'fan@example.com';
    component.password = 'user-entered-password';

    await component.onLogin();

    expect(authService.login).toHaveBeenCalledWith('fan@example.com', 'user-entered-password');
    expect(authState.setUser).toHaveBeenCalledWith({
      email: 'fan@example.com', name: 'Race fan', favouriteTeam: '',
    });
    expect(eventBus.emit).toHaveBeenCalledWith(BusEventType.AUTH_SUCCESS, 'fan@example.com');
    expect(navigate).toHaveBeenCalledWith(['/predictor']);
    expect(component.isLoading()).toBe(false);
  });

  it('waits for a required new password before returning to prediction', async () => {
    authService.login.mockResolvedValue({
      isSignedIn: false,
      nextStep: { signInStep: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED' },
    });
    component.email = 'fan@example.com';

    await component.onLogin();

    expect(component.step()).toBe('new-password');
    expect(navigate).not.toHaveBeenCalled();
    expect(authState.setUser).not.toHaveBeenCalled();

    authService.confirmNewPassword.mockResolvedValue({ isSignedIn: true });
    component.newPassword = 'new-user-password';
    component.name = 'Race fan';
    await component.onSetNewPassword();

    expect(authService.confirmNewPassword).toHaveBeenCalledWith('new-user-password', 'Race fan');
    expect(navigate).toHaveBeenCalledWith(['/predictor']);
    expect(eventBus.emit).toHaveBeenCalledWith(BusEventType.AUTH_SUCCESS, 'fan@example.com');
  });

  it('returns an existing signed-in user to prediction without signing in again', async () => {
    authService.getCurrentUser.mockResolvedValue({ username: 'opaque-cognito-username' });
    authService.getUserAttributes.mockResolvedValue({ email: 'fan@example.com', name: 'Race fan' });

    await component.checkExistingSession();

    expect(authState.setUser).toHaveBeenCalledWith({
      email: 'fan@example.com', name: 'Race fan', favouriteTeam: '',
    });
    expect(navigate).toHaveBeenCalledWith(['/predictor']);
    expect(authService.login).not.toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith(BusEventType.AUTH_SUCCESS, 'fan@example.com');
  });

  it('clears a legacy shared guest session and stays on sign-in for a personal account', async () => {
    authService.getCurrentUser.mockResolvedValue({ username: 'opaque-guest-username' });
    authService.getUserAttributes.mockResolvedValue({ email: 'guest@f1racelab.com', name: 'Guest' });
    let completeLogout!: () => void;
    authService.logout.mockReturnValue(new Promise<void>(resolve => { completeLogout = resolve; }));

    const restore = component.checkExistingSession();
    await Promise.resolve();
    await Promise.resolve();

    expect(authState.clearUser).toHaveBeenCalled();
    expect(authService.logout).toHaveBeenCalled();
    expect(component.isLoading()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();

    completeLogout();
    await restore;

    expect(component.step()).toBe('login');
    expect(component.isLoading()).toBe(false);
    expect(authState.setUser).not.toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith(BusEventType.AUTH_LOGOUT, null);
    expect(eventBus.emit).not.toHaveBeenCalledWith(BusEventType.AUTH_SUCCESS, expect.anything());
    expect(navigate).not.toHaveBeenCalled();
  });

  it('still allows personal sign-in when clearing the old guest session fails', async () => {
    authService.getCurrentUser.mockResolvedValue({ username: 'guest@f1racelab.com' });
    authService.logout.mockRejectedValue(new Error('Session expired'));

    await component.checkExistingSession();

    expect(authState.clearUser).toHaveBeenCalled();
    expect(component.step()).toBe('login');
    expect(component.isLoading()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
    expect(authState.setUser).not.toHaveBeenCalled();
  });

  it('keeps a failed sign-in on the form without authenticating or navigating', async () => {
    authService.login.mockRejectedValue(new Error('Incorrect email or password'));

    await component.onLogin();

    expect(component.error()).toBe('Incorrect email or password');
    expect(component.isLoading()).toBe(false);
    expect(authState.setUser).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
