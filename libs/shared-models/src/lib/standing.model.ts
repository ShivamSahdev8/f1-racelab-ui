import { Driver } from './driver.model';

export interface DriverStanding {
  position: number;
  driver: Driver;
  points: number;
  wins: number;
  podiums: number;
}

export interface TeamStanding {
  position: number;
  teamName: string;
  teamColor: string;
  points: number;
  wins: number;
}