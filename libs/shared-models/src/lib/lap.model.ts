export interface LapData {
  driverNumber: number;
  lapNumber: number;
  lapTime: string;
  lapDuration: number;
  sector1: number;
  sector2: number;
  sector3: number;
  isPitOutLap: boolean;
  stint: number;
  compound: TyreCompound;
}

export type TyreCompound = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET';