import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
    safetyCarChance: number;
    rainChance: number;
    darkHorse: DarkHorse;
    keyBattle: string;
    circuitInsight: string;
  };
}

const API_URL = 'https://yo8jy0lpwl.execute-api.us-east-2.amazonaws.com/prod';

@Injectable({ providedIn: 'root' })
export class PredictionService {

  constructor(private http: HttpClient) {}

  getOverview(): Observable<RaceOverview> {
    return this.http.post<RaceOverview>(`${API_URL}/predict`, {
      type: 'overview'
    });
  }

  predict(request: PredictionRequest): Observable<PredictionResult> {
    return this.http.post<PredictionResult>(`${API_URL}/predict`, request);
  }
}