export interface Race {
  raceId: number;
  season: number;
  round: number;
  raceName: string;
  circuitName: string;
  country: string;
  city: string;
  date: string;
  time: string;
  laps: number;
}

export interface Circuit {
  circuitId: string;
  circuitName: string;
  country: string;
  city: string;
  length: number;
  laps: number;
  lapRecord: string;
  lapRecordDriver: string;
}