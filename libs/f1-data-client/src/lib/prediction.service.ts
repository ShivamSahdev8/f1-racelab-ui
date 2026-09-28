import { Injectable, OnDestroy, signal } from '@angular/core';
import { AuthStateService } from '@f1-racelab/shared-ui';
import { DriverStanding } from '@f1-racelab/shared-models';
import { ErgastService } from './ergast.service';
import { estimateOverview, estimatePrediction } from './local-prediction';
import { Observable, catchError, combineLatest, defer, finalize, from, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';

export interface PredictionRequest {
  driver: string;
  circuit: string;
  tyres: string;
  weather: string;
  downforce: string;
  strategy: string;
}

export interface OptimalSetup {
  tyres: string;
  strategy: string;
  downforce: string;
  winChance: number;
  explanation: string;
}

export interface PredictionResult {
  winChance: number;
  podiumChance: number;
  expectedPosition: number;
  expectedPoints: number;
  insight: string;
  riskFactor: string;
  optimalSetup: OptimalSetup;
  funFact: string;
}

export interface Contender {
  position: number;
  driver: string;
  team: string;
  winChance: number;
  form: string;
  reason: string;
}

export interface DarkHorse {
  driver: string;
  team: string;
  reason: string;
}

export interface RaceOverview {
  race: any;
  prediction: {
    contenders: Contender[];
    safetyCarChance: number | null;
    rainChance: number | null;
    darkHorse: DarkHorse;
    keyBattle: string;
    circuitInsight: string;
  };
}

const GUEST_TRIAL_KEY = 'f1racelab.prediction.guest-trial.v2';
const GUEST_RESULT_KEY = 'f1racelab.prediction.guest-result.v2';
const CACHE_TTL_MS = 15 * 60 * 1000;

export type PredictionAccessCode =
  | 'SIGN_IN_REQUIRED'
  | 'STORAGE_UNAVAILABLE'
  | 'GUEST_LIMIT_REACHED'
  | 'DAILY_LIMIT_REACHED'
  | 'GLOBAL_LIMIT_REACHED'
  | 'RATE_LIMITED'
  | 'DATA_UNAVAILABLE';

export class PredictionAccessError extends Error {
  constructor(public readonly code: PredictionAccessCode, message: string) {
    super(message);
    this.name = 'PredictionAccessError';
  }
}

interface SavedGuestPrediction {
  request: PredictionRequest;
  result: PredictionResult;
}

export interface GuestPredictionState {
  loading: boolean;
  request: PredictionRequest | null;
  result: PredictionResult | null;
  error: unknown | null;
}

interface CachedResponse {
  value: PredictionResult | RaceOverview;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class PredictionService implements OnDestroy {
  private readonly trialUsed = signal(false);
  readonly guestTrialUsed = this.trialUsed.asReadonly();
  private readonly guestState = signal<GuestPredictionState>({
    loading: false, request: null, result: null, error: null
  });
  readonly guestRequestState = this.guestState.asReadonly();
  private pendingGuest: Observable<PredictionResult> | null = null;
  private storageUnavailable = false;
  private readonly cache = new Map<string, CachedResponse>();
  private readonly pending = new Map<string, Observable<PredictionResult | RaceOverview>>();
  private standingsCache: Observable<DriverStanding[]> | null = null;
  private standingsExpiresAt = 0;
  private readonly onStorage = (event: StorageEvent) => {
    if (event.key === GUEST_TRIAL_KEY || event.key === null) this.refreshTrial();
  };

  constructor(private ergast: ErgastService, private authState: AuthStateService) {
    this.refreshTrial();
    const saved = this.getGuestPrediction();
    if (saved) this.guestState.set({ ...saved, loading: false, error: null });
    if (typeof window !== 'undefined') window.addEventListener('storage', this.onStorage);
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') window.removeEventListener('storage', this.onStorage);
  }

  isMember(): boolean {
    const user = this.authState.getUser();
    return this.authState.isLoggedIn() && !!user &&
      user.email.toLowerCase() !== 'guest@f1racelab.com';
  }

  requiresSignIn(): boolean {
    return !this.isMember() && this.guestTrialUsed();
  }

  getGuestPrediction(): SavedGuestPrediction | null {
    try {
      const raw = localStorage.getItem(GUEST_RESULT_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw) as SavedGuestPrediction;
      const requestFields: (keyof PredictionRequest)[] = [
        'driver', 'circuit', 'tyres', 'weather', 'downforce', 'strategy'
      ];
      const optimal = saved?.result?.optimalSetup;
      // Local data may be stale or malformed. Never feed invalid values into the UI.
      if (!saved?.request || !saved?.result ||
          !requestFields.every(field => typeof saved.request[field] === 'string') ||
          !['winChance', 'podiumChance', 'expectedPosition', 'expectedPoints'].every(
            field => Number.isFinite((saved.result as unknown as Record<string, unknown>)[field])
          ) || !optimal || !Number.isFinite(optimal.winChance) ||
          ![optimal.tyres, optimal.strategy, optimal.downforce, optimal.explanation,
            saved.result.insight, saved.result.riskFactor, saved.result.funFact
          ].every(value => typeof value === 'string')) {
        return null;
      }
      return saved;
    } catch {
      return null;
    }
  }

  getOverview(): Observable<RaceOverview> {
    return defer(() => {
      if (!this.isMember()) {
        return throwError(() => new PredictionAccessError(
          'SIGN_IN_REQUIRED', 'Sign in to view the race overview. Your free prediction is available in the simulator.'
        ));
      }
      return this.memberRequest<RaceOverview>('overview', () =>
        combineLatest([
          this.ergast.getRaceCalendar('current'),
          this.getStandings(),
        ]).pipe(map(([races, standings]) => estimateOverview(races, standings)))
      );
    });
  }

  predict(request: PredictionRequest): Observable<PredictionResult> {
    const setup = { ...request };
    return defer(() => {
      if (this.isMember()) {
        const key = JSON.stringify([
          setup.driver, setup.circuit, setup.tyres, setup.weather, setup.downforce, setup.strategy
        ]);
        return this.memberRequest<PredictionResult>(key, () =>
          this.getStandings().pipe(map(standings => estimatePrediction(setup, standings)))
        );
      }
      return this.guestRequest(setup);
    }).pipe(shareReplay({ bufferSize: 1, refCount: false }));
  }

  private guestRequest(setup: PredictionRequest): Observable<PredictionResult> {
    if (this.pendingGuest) return this.pendingGuest;
    const request$ = defer(() => {
      this.refreshTrial();
      if (this.guestTrialUsed()) {
        throw new PredictionAccessError('GUEST_LIMIT_REACHED', 'You have used your free prediction. Sign in to try another setup.');
      }
      this.guestState.set({ loading: true, request: setup, result: null, error: null });
      return this.getStandings();
    }).pipe(
      map(standings => estimatePrediction(setup, standings)),
      switchMap(result => from(this.claimGuestTrial()).pipe(map(() => result))),
      tap(result => {
        this.guestState.set({ loading: false, request: setup, result, error: null });
        try {
          localStorage.setItem(GUEST_RESULT_KEY, JSON.stringify({ request: setup, result }));
        } catch {
          // The estimate is still visible for this session.
        }
      }),
      catchError(error => {
        const failure = this.predictionError(error);
        this.guestState.update(state => ({ ...state, loading: false, error: failure }));
        return throwError(() => failure);
      }),
      finalize(() => { this.pendingGuest = null; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.pendingGuest = request$;
    return request$;
  }

  private memberRequest<T extends PredictionResult | RaceOverview>(
    requestKey: string, compute: () => Observable<T>
  ): Observable<T> {
    const key = `${this.authState.getUser()?.email}:${requestKey}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return of(cached.value as T);
    this.cache.delete(key);

    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight as Observable<T>;

    const request$ = defer(compute).pipe(
      tap(value => {
        // Bound memory as users explore different setups.
        if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
      }),
      catchError(error => throwError(() => this.predictionError(error))),
      finalize(() => this.pending.delete(key)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.pending.set(key, request$);
    return request$;
  }

  private getStandings(): Observable<DriverStanding[]> {
    if (this.standingsCache && this.standingsExpiresAt > Date.now()) {
      return this.standingsCache;
    }
    this.standingsExpiresAt = Date.now() + CACHE_TTL_MS;
    this.standingsCache = this.ergast.getDriverStandings('current').pipe(
      catchError(error => {
        this.standingsCache = null;
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.standingsCache;
  }

  private async claimGuestTrial(): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(GUEST_TRIAL_KEY, () => this.consumeGuestTrial());
    }
    return this.consumeGuestTrial();
  }

  private consumeGuestTrial(): void {
    this.refreshTrial();
    if (this.storageUnavailable) {
      throw new PredictionAccessError('STORAGE_UNAVAILABLE', 'Enable browser storage or sign in to make a prediction.');
    }
    if (this.guestTrialUsed()) {
      throw new PredictionAccessError('GUEST_LIMIT_REACHED', 'You have used your free prediction. Sign in to try another setup.');
    }
    try {
      localStorage.setItem(GUEST_TRIAL_KEY, '1');
      if (localStorage.getItem(GUEST_TRIAL_KEY) !== '1') throw new Error('Storage write failed');
      this.trialUsed.set(true);
    } catch {
      this.storageUnavailable = true;
      this.trialUsed.set(true);
      throw new PredictionAccessError('STORAGE_UNAVAILABLE', 'Enable browser storage or sign in to make a prediction.');
    }
  }

  private refreshTrial(): void {
    try {
      const used = localStorage.getItem(GUEST_TRIAL_KEY) !== null;
      this.trialUsed.set(used || this.storageUnavailable);
    } catch {
      this.storageUnavailable = true;
      this.trialUsed.set(true);
    }
  }

  private predictionError(error: unknown): PredictionAccessError {
    if (error instanceof PredictionAccessError) return error;
    return new PredictionAccessError(
      'DATA_UNAVAILABLE',
      'Current standings are unavailable. Please try again later; your guest prediction was not used.',
    );
  }
}
