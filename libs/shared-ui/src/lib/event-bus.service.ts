import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Driver, Race, LapData, Position } from '@f1-racelab/shared-models';

// Event Types
export enum BusEventType {
  DRIVER_SELECTED    = 'DRIVER_SELECTED',
  RACE_SELECTED      = 'RACE_SELECTED',
  LAP_DATA_UPDATED   = 'LAP_DATA_UPDATED',
  POSITION_UPDATED   = 'POSITION_UPDATED',
  SAFETY_CAR         = 'SAFETY_CAR',
  SESSION_STARTED    = 'SESSION_STARTED',
  SESSION_ENDED      = 'SESSION_ENDED',
}

// Event Shape
export interface BusEvent<T = unknown> {
  type: BusEventType;
  payload: T;
}

@Injectable({ providedIn: 'root' })
export class EventBusService {

  private bus = new Subject<BusEvent>();

  // Emit any event
  emit<T>(type: BusEventType, payload: T): void {
    this.bus.next({ type, payload });
  }

  // Listen to a specific event
  on<T>(type: BusEventType): Observable<T> {
    return this.bus.asObservable().pipe(
      filter(event => event.type === type),
      map(event => event.payload as T)
    );
  }

  // ── Convenience methods ──────────────────────────────

  // Driver selected (e.g. live-mfe → fantasy-mfe)
  selectDriver(driver: Driver): void {
    this.emit(BusEventType.DRIVER_SELECTED, driver);
  }

  onDriverSelected(): Observable<Driver> {
    return this.on<Driver>(BusEventType.DRIVER_SELECTED);
  }

  // Race selected (e.g. stats-mfe → predictor-mfe)
  selectRace(race: Race): void {
    this.emit(BusEventType.RACE_SELECTED, race);
  }

  onRaceSelected(): Observable<Race> {
    return this.on<Race>(BusEventType.RACE_SELECTED);
  }

  // Live lap data updated
  updateLapData(lap: LapData): void {
    this.emit(BusEventType.LAP_DATA_UPDATED, lap);
  }

  onLapDataUpdated(): Observable<LapData> {
    return this.on<LapData>(BusEventType.LAP_DATA_UPDATED);
  }

  // Position updated
  updatePosition(position: Position): void {
    this.emit(BusEventType.POSITION_UPDATED, position);
  }

  onPositionUpdated(): Observable<Position> {
    return this.on<Position>(BusEventType.POSITION_UPDATED);
  }

  // Safety car deployed
  safetyCar(active: boolean): void {
    this.emit(BusEventType.SAFETY_CAR, active);
  }

  onSafetyCar(): Observable<boolean> {
    return this.on<boolean>(BusEventType.SAFETY_CAR);
  }
}