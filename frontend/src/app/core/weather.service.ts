import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface WeatherAlert {
  id: string;
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Elevated';
  area: string;
  headline: string;
  status: string;
  startsAt: string;
  endsAt: string;
  category: string;
  why: string;
  locationIndex: string;
  cause: string;
  whatToDo: string;
}

export interface WeatherHistoryEntry {
  id: string;
  category: string;
  headline: string;
  lastSeen: string;
  count: number;
  whatItMeans: string;
  locationIndex: string;
}

export interface WeatherAlertsResponse {
  generatedAt: string;
  alerts: WeatherAlert[];
  history: WeatherHistoryEntry[];
}

export interface WeatherOverviewResponse {
  generatedAt: string;
  totalAlerts: number;
  severeAlerts: number;
  watchCount: number;
  categories: string[];
  topHeadline: string;
  mostAtRiskArea: string;
}

@Injectable({
  providedIn: 'root',
})
export class WeatherService {
  private readonly http = inject(HttpClient);

  getAlerts(): Observable<WeatherAlertsResponse> {
    return this.http.get<WeatherAlertsResponse>('/api/alerts');
  }

  getOverview(): Observable<WeatherOverviewResponse> {
    return this.http.get<WeatherOverviewResponse>('/api/overview');
  }
}
