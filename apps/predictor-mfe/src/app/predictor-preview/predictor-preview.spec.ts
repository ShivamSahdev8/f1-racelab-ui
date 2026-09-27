import { Component, Input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AuthStateService } from '@f1-racelab/shared-ui';
import {
  GuestPredictionState,
  PredictionRequest,
  PredictionResult,
  PredictionService,
} from '@f1-racelab/f1-data-client';
import { PredictorPreview } from './predictor-preview';
import { F1CarVisualComponent } from '../f1-car-visual/f1-car-visual';
import { CircuitVisual } from '../circuit-visual/circuit-visual';

@Component({ selector: 'app-f1-car-visual', standalone: true, template: '' })
class CarStub {
  @Input() driver = '';
  @Input() tyres = '';
  @Input() weather = '';
  @Input() downforce = '';
  @Input() isLoading = false;
  @Input() winChance = 0;
}

@Component({ selector: 'app-circuit-visual', standalone: true, template: '' })
class CircuitStub {
  @Input() circuit = '';
  @Input() teamColor = '';
  @Input() showStats = false;
}

const setup: PredictionRequest = {
  driver: 'Lando Norris',
  circuit: 'Canada',
  tyres: 'SOFT',
  weather: 'DRY',
  downforce: 'HIGH',
  strategy: '1-STOP',
};
const result: PredictionResult = {
  winChance: 30,
  podiumChance: 60,
  expectedPosition: 3,
  expectedPoints: 15,
  insight: 'A competitive setup.',
  riskFactor: 'MEDIUM',
  funFact: 'Test insight.',
  optimalSetup: {
    tyres: 'MEDIUM',
    strategy: '1-STOP',
    downforce: 'HIGH',
    winChance: 35,
    explanation: 'More consistent pace.',
  },
};

describe('PredictorPreview trial flow', () => {
  let fixture: ComponentFixture<PredictorPreview>;
  let component: PredictorPreview;
  let auth: AuthStateService;
  let used: ReturnType<typeof signal<boolean>>;
  let response: Subject<PredictionResult>;
  let service: {
    isMember: jest.Mock;
    requiresSignIn: jest.Mock;
    getGuestPrediction: jest.Mock;
    predict: jest.Mock;
    getOverview: jest.Mock;
    guestTrialUsed: ReturnType<typeof signal<boolean>>;
    guestRequestState: ReturnType<typeof signal<GuestPredictionState>>;
  };

  beforeEach(async () => {
    auth = new AuthStateService();
    used = signal(false);
    response = new Subject<PredictionResult>();
    service = {
      isMember: jest.fn(() => auth.isLoggedIn()),
      requiresSignIn: jest.fn(() => !auth.isLoggedIn() && used()),
      getGuestPrediction: jest.fn(() => null),
      predict: jest.fn(() => {
        used.set(true);
        return response.asObservable();
      }),
      getOverview: jest.fn(() =>
        of({ race: {}, prediction: { contenders: [], darkHorse: {} } }),
      ),
      guestTrialUsed: used,
      guestRequestState: signal<GuestPredictionState>({ loading: false, request: null, result: null, error: null }),
    };
    await TestBed.configureTestingModule({
      imports: [PredictorPreview],
      providers: [
        provideRouter([]),
        { provide: AuthStateService, useValue: auth },
        { provide: PredictionService, useValue: service },
      ],
    })
      .overrideComponent(PredictorPreview, {
        remove: { imports: [F1CarVisualComponent, CircuitVisual] },
        add: { imports: [CarStub, CircuitStub] },
      })
      .compileComponents();
  });

  function create() {
    fixture = TestBed.createComponent(PredictorPreview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function selectSetup() {
    component.selectedDriver = setup.driver;
    component.selectedCircuit = setup.circuit;
  }

  it('opens the simulator and makes no paid requests on visits, setup edits, or tab changes', () => {
    create();
    expect(component.activeView).toBe('simulator');
    selectSetup();
    component.selectedTyres = 'HARD';
    component.setView('overview');
    component.loadOverview();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Sign in for race overview',
    );
    component.setView('simulator');
    expect(service.predict).not.toHaveBeenCalled();
    expect(service.getOverview).not.toHaveBeenCalled();
  });

  it('validates selections before spending the guest trial', () => {
    create();
    component.onPredict();
    expect(service.predict).not.toHaveBeenCalled();
    expect(used()).toBe(false);
    expect(component.error()).toContain('select a driver and circuit');
  });

  it('sends one request, blocks double clicks, and keeps the result visible after the sign-in gate', () => {
    create();
    selectSetup();
    component.onPredict();
    component.onPredict();
    expect(service.predict).toHaveBeenCalledTimes(1);
    expect(service.predict).toHaveBeenCalledWith(setup);
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
    response.next(result);
    component.onPredict();
    fixture.detectChanges();
    expect(service.predict).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain(result.insight);
    expect(
      fixture.nativeElement
        .querySelector('.sign-in-predict')
        .getAttribute('href'),
    ).toBe('/auth/login');
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(
      false,
    );
  });

  it('restores a saved guest result and setup without generating again', () => {
    used.set(true);
    service.getGuestPrediction.mockReturnValue({ request: setup, result });
    create();
    expect(component.prediction()).toEqual(result);
    expect(component.selectedDriver).toBe(setup.driver);
    expect(component.selectedCircuit).toBe(setup.circuit);
    expect(fixture.nativeElement.textContent).toContain(result.insight);
    component.onPredict();
    expect(service.predict).not.toHaveBeenCalled();
  });

  it('reattaches to a pending guest request after navigation without spending another trial', () => {
    used.set(true);
    service.guestRequestState.set({ loading: true, request: setup, result: null, error: null });
    create();
    expect(component.isLoading()).toBe(true);
    expect(component.selectedDriver).toBe(setup.driver);
    component.onPredict();
    service.guestRequestState.set({ loading: false, request: setup, result, error: null });
    fixture.detectChanges();
    expect(component.isLoading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain(result.insight);
    expect(service.predict).not.toHaveBeenCalled();
  });

  it('does not automatically retry an uncertain failed guest request', () => {
    create();
    selectSetup();
    component.onPredict();
    response.error(new Error('Timeout'));
    component.onPredict();
    expect(component.isLoading()).toBe(false);
    expect(component.error()).toContain('Unable to complete');
    expect(service.predict).toHaveBeenCalledTimes(1);
  });

  it('allows further predictions after real sign-in and generates overview only on explicit request', () => {
    used.set(true);
    create();
    auth.setUser({
      email: 'member@example.com',
      name: 'Member',
      favouriteTeam: '',
    });
    fixture.detectChanges();
    expect(component.requiresSignIn()).toBe(false);
    selectSetup();
    component.onPredict();
    expect(service.predict).toHaveBeenCalledTimes(1);
    component.setView('overview');
    expect(service.getOverview).not.toHaveBeenCalled();
    component.loadOverview();
    expect(service.getOverview).toHaveBeenCalledTimes(1);
  });
});
