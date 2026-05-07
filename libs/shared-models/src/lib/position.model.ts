import { TyreCompound } from './lap.model';

export interface Position {
  driverNumber: number;
  driverName: string;
  teamName: string;
  teamColor: string;
  position: number;
  gap: string;
  interval: string;
  lastLapTime: string;
  currentLap: number;
  tyreCompound: TyreCompound;
  pitStops: number;
  status: DriverStatus;
}

export interface PitStop {
  driverNumber: number;
  lapNumber: number;
  duration: number;
  pitInTime: string;
  pitOutTime: string;
}

export type DriverStatus = 'ON_TRACK' | 'PIT' | 'OUT' | 'SAFETY_CAR';