import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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

export interface TrackerIncident {
  id: string;
  headline: string;
  category: string;
  severity: string;
  area: string;
  scope?: string; // maine | usa | canada | global
  datePulled: string;
  startsAt?: string;
  endsAt?: string;
  description?: string;
  isTornado: boolean;
}

export interface ChaseLogEntry {
  id: string;
  title: string;
  chaseDate: string;
  state: string;
  lat?: number;
  lon?: number;
  efRating?: number;
  milesDriven: number;
  notes?: string;
  createdAt: string;
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
    return this.http.get<WeatherAlertsResponse>('/api/alerts').pipe(
      catchError(err => {
        console.error('getAlerts error:', err);
        return of({ generatedAt: new Date().toISOString(), alerts: [], history: [] });
      })
    );
  }

  getOverview(): Observable<WeatherOverviewResponse> {
    return this.http.get<WeatherOverviewResponse>('/api/overview').pipe(
      catchError(err => {
        console.error('getOverview error:', err);
        return of({ generatedAt: new Date().toISOString(), totalAlerts: 0, severeAlerts: 0, watchCount: 0, categories: [], topHeadline: '', mostAtRiskArea: '' });
      })
    );
  }

  getHistory(filters?: { search?: string, severity?: string, category?: string, scope?: string, tornadoOnly?: boolean }): Observable<TrackerIncident[]> {
    let params = new URLSearchParams();
    if (filters) {
      if (filters.search) params.set('search', filters.search);
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.category) params.set('category', filters.category);
      if (filters.scope) params.set('scope', filters.scope);
      if (filters.tornadoOnly) params.set('tornadoOnly', 'true');
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    
    return this.http.get<TrackerIncident[]>(`/api/history${query}`).pipe(
      catchError(err => {
        console.error('getHistory error:', err);
        return of([]);
      })
    );
  }

  deleteHistory(id: string): Observable<void> {
    return this.http.delete<void>(`/api/history/${id}`);
  }

  getChaseLogs(): Observable<ChaseLogEntry[]> {
    return this.http.get<ChaseLogEntry[]>('/api/chaselogs').pipe(
      catchError(err => {
        console.error('getChaseLogs error:', err);
        return of([]);
      })
    );
  }

  createChaseLog(log: Partial<ChaseLogEntry>): Observable<ChaseLogEntry> {
    return this.http.post<ChaseLogEntry>('/api/chaselogs', log);
  }

  deleteChaseLog(id: string): Observable<void> {
    return this.http.delete<void>(`/api/chaselogs/${id}`);
  }
}
