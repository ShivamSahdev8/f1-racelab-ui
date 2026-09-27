import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthStateService } from '@f1-racelab/shared-ui';
import { PredictionService, PredictionRequest, PredictionResult, RaceOverview } from '@f1-racelab/f1-data-client';
import { fetchAuthSession } from 'aws-amplify/auth';
import { firstValueFrom } from 'rxjs';

jest.mock('aws-amplify/auth', () => ({ fetchAuthSession: jest.fn() }));

const setup: PredictionRequest = {
  driver: 'Lando Norris', circuit: 'Canada', tyres: 'SOFT', weather: 'DRY',
  downforce: 'HIGH', strategy: '1-STOP'
};
const result: PredictionResult = {
  winChance: 30, podiumChance: 60, expectedPosition: 3, expectedPoints: 15,
  insight: 'A competitive setup.', riskFactor: 'LOW', funFact: 'A test prediction.',
  optimalSetup: {
    tyres: 'MEDIUM', strategy: '1-STOP', downforce: 'HIGH', winChance: 35, explanation: 'More consistent pace.'
  }
};
const overview = {
  race: { name: 'Canadian Grand Prix' }, prediction: { contenders: [] }
} as unknown as RaceOverview;

describe('PredictionService request budget', () => {
  let service: PredictionService;
  let auth: AuthStateService;
  let http: HttpTestingController;
  const session = jest.mocked(fetchAuthSession);
  const settle = () => new Promise<void>(resolve => setTimeout(resolve, 0));

  beforeEach(() => {
    localStorage.clear();
    session.mockReset();
    session.mockResolvedValue({ tokens: { idToken: { toString: () => 'member-token' } } } as never);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), PredictionService, AuthStateService]
    });
    service = TestBed.inject(PredictionService);
    auth = TestBed.inject(AuthStateService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    jest.restoreAllMocks();
    localStorage.clear();
  });

  function signIn(email = 'member@example.com') {
    auth.setUser({ email, name: 'Test member', favouriteTeam: 'McLaren' });
  }

  it('never calls the paid overview endpoint for anonymous or legacy guest users', async () => {
    await expect(firstValueFrom(service.getOverview())).rejects.toMatchObject({ code: 'SIGN_IN_REQUIRED' });
    signIn('guest@f1racelab.com');
    expect(service.isMember()).toBe(false);
    await expect(firstValueFrom(service.getOverview())).rejects.toMatchObject({ code: 'SIGN_IN_REQUIRED' });
    expect(service.guestTrialUsed()).toBe(false);
    http.expectNone(() => true);
  });

  it('consumes the guest attempt before HTTP, saves the setup/result, and blocks after reload', async () => {
    const prediction = firstValueFrom(service.predict(setup));
    await settle();
    expect(service.guestTrialUsed()).toBe(true);
    expect(service.requiresSignIn()).toBe(true);
    expect(localStorage.getItem('f1racelab.prediction.guest-trial.v1')).toBe('1');
    const request = http.expectOne(req => req.url.endsWith('/predict'));
    expect(request.request.body).toMatchObject(setup);
    expect(request.request.body.guestId).toBe(localStorage.getItem('f1racelab.prediction.guest-id.v1'));
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(result);
    await expect(prediction).resolves.toEqual(result);
    expect(service.getGuestPrediction()).toEqual({ request: setup, result });

    const reloaded = new PredictionService(TestBed.inject(HttpClient), auth);
    expect(reloaded.getGuestPrediction()).toEqual({ request: setup, result });
    expect(reloaded.guestRequestState()).toEqual({ request: setup, result, loading: false, error: null });
    await expect(firstValueFrom(reloaded.predict(setup))).rejects.toMatchObject({ code: 'GUEST_LIMIT_REACHED' });
    reloaded.ngOnDestroy();
    http.expectNone(() => true);
  });

  it('does not restore the allowance or retry after an uncertain server failure', async () => {
    const prediction = firstValueFrom(service.predict(setup));
    const failed = expect(prediction).rejects.toMatchObject({ status: 503 });
    await settle();
    http.expectOne(req => req.url.endsWith('/predict')).flush({}, { status: 503, statusText: 'Unavailable' });
    await failed;
    expect(service.guestRequestState()).toMatchObject({ loading: false, request: setup, error: { status: 503 } });
    await expect(firstValueFrom(service.predict(setup))).rejects.toMatchObject({ code: 'GUEST_LIMIT_REACHED' });
    expect(service.guestTrialUsed()).toBe(true);
    http.expectNone(() => true);
  });

  it('blocks dispatch when browser storage cannot persist the allowance', async () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    await expect(firstValueFrom(service.predict(setup))).rejects.toMatchObject({ code: 'STORAGE_UNAVAILABLE' });
    expect(service.requiresSignIn()).toBe(true);
    http.expectNone(() => true);
  });

  it('updates the gate when a different tab consumes its allowance', () => {
    localStorage.setItem('f1racelab.prediction.guest-trial.v1', '1');
    window.dispatchEvent(new StorageEvent('storage', { key: 'f1racelab.prediction.guest-trial.v1' }));
    expect(service.requiresSignIn()).toBe(true);
  });

  it('rejects saved results with malformed setup values', () => {
    localStorage.setItem('f1racelab.prediction.guest-result.v1', JSON.stringify({
      request: setup, result: { ...result, optimalSetup: { ...result.optimalSetup, tyres: 123 } }
    }));
    expect(service.getGuestPrediction()).toBeNull();
  });

  it('fails closed if reading browser storage becomes unavailable', async () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    await expect(firstValueFrom(service.predict(setup))).rejects.toMatchObject({ code: 'STORAGE_UNAVAILABLE' });
    expect(service.requiresSignIn()).toBe(true);
    http.expectNone(() => true);
  });

  it('serializes concurrent guest claims with Web Locks and sends one request', async () => {
    let queue = Promise.resolve();
    const lock = jest.fn((_name: string, callback: () => string) => {
      const claim = queue.then(callback);
      queue = claim.then(() => undefined, () => undefined);
      return claim;
    });
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: lock } });
    const otherTab = new PredictionService(TestBed.inject(HttpClient), auth);
    try {
      const first = firstValueFrom(service.predict(setup));
      const second = expect(firstValueFrom(otherTab.predict(setup))).rejects.toMatchObject({ code: 'GUEST_LIMIT_REACHED' });
      await settle();
      expect(lock).toHaveBeenCalledTimes(2);
      http.expectOne(req => req.url.endsWith('/predict')).flush(result);
      await first;
      await second;
    } finally {
      otherTab.ngOnDestroy();
      Reflect.deleteProperty(navigator, 'locks');
    }
  });

  it('keeps a guest request alive and lets a returning view observe its result without another call', async () => {
    const departingView = service.predict(setup).subscribe();
    await settle();
    const request = http.expectOne(req => req.url.endsWith('/predict'));
    expect(service.guestRequestState()).toEqual({ loading: true, request: setup, result: null, error: null });
    departingView.unsubscribe();
    expect(request.cancelled).toBe(false);

    // A new view can attach while the first request is still running. Its changed setup cannot replace it.
    const returningView = firstValueFrom(service.predict({ ...setup, tyres: 'HARD' }));
    await settle();
    expect(service.guestRequestState().request).toEqual(setup);
    http.expectNone(() => true);
    request.flush(result);
    await expect(returningView).resolves.toEqual(result);
    expect(service.guestRequestState()).toEqual({ loading: false, request: setup, result, error: null });
    expect(service.getGuestPrediction()).toEqual({ request: setup, result });
  });

  it('shares concurrent member predictions and caches identical setups for 15 minutes', async () => {
    signIn();
    const now = Date.now();
    const time = jest.spyOn(Date, 'now').mockReturnValue(now);
    const first = firstValueFrom(service.predict(setup));
    const second = firstValueFrom(service.predict({ ...setup }));
    await settle();
    const request = http.expectOne(req => req.url.endsWith('/predict'));
    expect(request.request.headers.get('Authorization')).toBe('Bearer member-token');
    expect(request.request.body.guestId).toBeUndefined();
    request.flush(result);
    await expect(first).resolves.toEqual(result);
    await expect(second).resolves.toEqual(result);
    await expect(firstValueFrom(service.predict(setup))).resolves.toEqual(result);
    http.expectNone(() => true);
    expect(service.guestTrialUsed()).toBe(false);

    time.mockReturnValue(now + 15 * 60 * 1000 + 1);
    const expired = firstValueFrom(service.predict(setup));
    await settle();
    http.expectOne(req => req.url.endsWith('/predict')).flush(result);
    await expired;
  });

  it('shares member overview requests and caches the overview', async () => {
    signIn();
    const first = firstValueFrom(service.getOverview());
    const second = firstValueFrom(service.getOverview());
    await settle();
    const request = http.expectOne(req => req.body.type === 'overview');
    expect(request.request.headers.get('Authorization')).toBe('Bearer member-token');
    request.flush(overview);
    await first;
    await second;
    await expect(firstValueFrom(service.getOverview())).resolves.toEqual(overview);
    http.expectNone(() => true);
  });

  it('keeps cached predictions separate for different members', async () => {
    signIn();
    const first = firstValueFrom(service.predict(setup));
    await settle();
    http.expectOne(req => req.url.endsWith('/predict')).flush(result);
    await first;
    signIn('other@example.com');
    const second = firstValueFrom(service.predict(setup));
    await settle();
    http.expectOne(req => req.url.endsWith('/predict')).flush(result);
    await second;
  });

  it('requires a valid Cognito session before dispatching a member request', async () => {
    signIn();
    session.mockResolvedValue({} as never);
    await expect(firstValueFrom(service.predict(setup))).rejects.toMatchObject({ code: 'SIGN_IN_REQUIRED' });
    http.expectNone(() => true);
  });

  it.each(['GUEST_LIMIT_REACHED', 'DAILY_LIMIT_REACHED', 'GLOBAL_LIMIT_REACHED'])(
    'exposes a useful access error for a backend %s response without retrying', async code => {
      signIn();
      const pending = firstValueFrom(service.predict(setup));
      const rejected = expect(pending).rejects.toMatchObject({ code, name: 'PredictionAccessError' });
      await settle();
      http.expectOne(req => req.url.endsWith('/predict')).flush({ code }, { status: 429, statusText: 'Too Many Requests' });
      await rejected;
      http.expectNone(() => true);
    }
  );

  it('explains a generic HTTP 429 throttle without retrying', async () => {
    signIn();
    const pending = firstValueFrom(service.predict(setup));
    const rejected = expect(pending).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    await settle();
    http.expectOne(req => req.url.endsWith('/predict')).flush({}, { status: 429, statusText: 'Too Many Requests' });
    await rejected;
    http.expectNone(() => true);
  });
});
