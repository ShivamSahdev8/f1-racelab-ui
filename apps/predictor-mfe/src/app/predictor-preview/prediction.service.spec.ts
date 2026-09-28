import { TestBed } from '@angular/core/testing';
import { AuthStateService } from '@f1-racelab/shared-ui';
import { DriverStanding, Race } from '@f1-racelab/shared-models';
import { ErgastService, PredictionRequest, PredictionService } from '@f1-racelab/f1-data-client';
import { firstValueFrom, of, throwError } from 'rxjs';

const setup: PredictionRequest = {
  driver: 'Lando Norris', circuit: 'Canada', tyres: 'MEDIUM', weather: 'DRY',
  downforce: 'MEDIUM', strategy: '1-STOP',
};
const standings = [
  ['Lando Norris', 'McLaren', 1, 200],
  ['Max Verstappen', 'Red Bull Racing', 2, 170],
  ['Charles Leclerc', 'Ferrari', 3, 150],
  ['George Russell', 'Mercedes', 4, 120],
].map(([fullName, teamName, position, points]) => ({
  position, points, wins: 0, podiums: 0,
  driver: { fullName, teamName },
})) as DriverStanding[];
const races = [{
  raceName: 'Canadian Grand Prix', circuitName: 'Circuit Gilles-Villeneuve',
  date: '2099-06-01', round: 7,
}] as Race[];

describe('browser-only prediction', () => {
  let service: PredictionService;
  let auth: AuthStateService;
  let ergast: { getDriverStandings: jest.Mock; getRaceCalendar: jest.Mock };

  beforeEach(() => {
    localStorage.clear();
    ergast = {
      getDriverStandings: jest.fn().mockReturnValue(of(standings)),
      getRaceCalendar: jest.fn().mockReturnValue(of(races)),
    };
    TestBed.configureTestingModule({
      providers: [
        PredictionService, AuthStateService,
        { provide: ErgastService, useValue: ergast },
      ],
    });
    service = TestBed.inject(PredictionService);
    auth = TestBed.inject(AuthStateService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  it('returns one guest result, saves it, and directs the next attempt to sign in', async () => {
    const result = await firstValueFrom(service.predict(setup));
    expect(result.winChance).toBeGreaterThan(0);
    expect(result.insight).toContain('P1 in the current championship');
    expect(service.guestTrialUsed()).toBe(true);
    expect(service.getGuestPrediction()).toEqual({ request: setup, result });
    expect(ergast.getDriverStandings).toHaveBeenCalledTimes(1);
    await expect(firstValueFrom(service.predict(setup))).rejects.toMatchObject({
      code: 'GUEST_LIMIT_REACHED',
    });

    const reloaded = new PredictionService(TestBed.inject(ErgastService), auth);
    expect(reloaded.getGuestPrediction()).toEqual({ request: setup, result });
    expect(reloaded.requiresSignIn()).toBe(true);
    reloaded.ngOnDestroy();
  });

  it('does not use the guest trial when standings fail to load', async () => {
    ergast.getDriverStandings.mockReturnValue(throwError(() => new Error('offline')));
    await expect(firstValueFrom(service.predict(setup))).rejects.toMatchObject({
      code: 'DATA_UNAVAILABLE',
    });
    expect(service.guestTrialUsed()).toBe(false);
    expect(service.requiresSignIn()).toBe(false);
  });

  it('calculates a lower estimate when the tyre does not suit the weather', async () => {
    auth.setUser({ email: 'member@example.com', name: 'Member', favouriteTeam: '' });
    const dry = await firstValueFrom(service.predict(setup));
    const wet = await firstValueFrom(service.predict({ ...setup, weather: 'WET' }));
    expect(wet.winChance).toBeLessThan(dry.winChance);
    expect(wet.riskFactor).toBe('HIGH');
    expect(wet.optimalSetup.tyres).toBe('WET');
    expect(service.guestTrialUsed()).toBe(false);
  });

  it('keeps the race overview behind sign-in and builds it from free standings data', async () => {
    await expect(firstValueFrom(service.getOverview())).rejects.toMatchObject({
      code: 'SIGN_IN_REQUIRED',
    });
    auth.setUser({ email: 'member@example.com', name: 'Member', favouriteTeam: '' });
    const overview = await firstValueFrom(service.getOverview());
    expect(overview.race.raceName).toBe('Canadian Grand Prix');
    expect(overview.prediction.contenders).toHaveLength(3);
    expect(overview.prediction.rainChance).toBeNull();
  });

  it('requires browser storage to record the guest trial', async () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });
    await expect(firstValueFrom(service.predict(setup))).rejects.toMatchObject({
      code: 'STORAGE_UNAVAILABLE',
    });
  });
});
