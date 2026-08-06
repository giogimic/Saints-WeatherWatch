import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

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
  scope?: string;
  source?: string;
  sourceUrl?: string;
  eventCode?: string;
  office?: string;
  centroidLat?: number;
  centroidLon?: number;
  geometry?: unknown;
  approximate?: boolean;
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
  source?: string;
  sourceUrl?: string;
  eventCode?: string;
  office?: string;
  status?: string;
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
  maineMetersOut?: number;
  maineCountiesOut?: number;
  maineOutageCovered?: boolean;
  outageSource?: string;
  outageNote?: string;
  floodActionable?: number;
  floodGaugeCount?: number;
  quakeCount?: number;
  hazardNote?: string;
}

export interface OutageCounty {
  fips: string;
  name: string;
  state: string;
  metersOut: number;
  utilities?: string[];
  lat?: number;
  lng?: number;
}

export interface OutageSnapshot {
  generatedAt: string;
  source: string;
  sourceNote: string;
  maineCovered: boolean;
  maineMetersOut: number;
  maineCountiesOut: number;
  nationalMetersOut: number;
  utilityReporters: number;
  maine: OutageCounty[];
  nearby: OutageCounty[];
  utilityLinks: { name: string; url: string; blurb: string }[];
}

export interface AreaOutageInfo {
  fips: string;
  county: string;
  metersOut: number;
  utilities?: string[];
  maineCovered: boolean;
  maineMetersOut: number;
  source: string;
  generatedAt: string;
  utilityLinks?: { name: string; url: string; blurb: string }[];
}

export interface RadarSite {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  distanceKm?: number;
}

export interface RadarLatLonBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface RadarProductDef {
  id: string;
  label: string;
  kind: 'wms' | 'ridge' | string;
  blurb: string;
  wms?: string;
  layer?: string;
  loopWms?: string;
  loopLayer?: string;
  loopSupported: boolean;
  scanRadar: string;
  scanProduct: string;
  ridgeSite?: string;
  ridgeProduct?: string;
  ridgeUrl?: string;
  bounds?: RadarLatLonBox;
  attribution: string;
}

export interface RadarScan {
  ts: string;
  validAt?: string;
  ageSeconds?: number;
  ridgeUrl?: string;
  wmsTime?: string;
}

export interface RadarOutagePair {
  maineMetersOut: number;
  deltaMeters?: number | null;
  note?: string;
  maineCovered?: boolean;
  outageSource?: string;
  sampledAt?: string;
  priorSampledAt?: string;
}

export interface RadarStatus {
  generatedAt: string;
  focusLat: number;
  focusLon: number;
  nearest?: RadarSite;
  composite?: RadarSite;
  products: RadarProductDef[];
  latestScan?: RadarScan;
  sourceNote: string;
  outagePair?: RadarOutagePair;
}

export interface RadarScansResponse {
  generatedAt: string;
  radar: string;
  product: string;
  scans: RadarScan[];
}

export interface HazardIncident {
  id: string;
  kind: 'flood' | 'quake' | 'fire' | 'smoke' | string;
  source: string;
  sourceUrl?: string;
  headline: string;
  status?: string;
  severity?: string;
  lat: number;
  lon: number;
  area?: string;
  observedAt?: string;
  meta?: Record<string, unknown>;
}

export interface HazardSnapshot {
  generatedAt: string;
  sourceNote: string;
  floodActionable: number;
  floodGaugeCount: number;
  quakeCount: number;
  fireCount: number;
  incidents: HazardIncident[];
  flood: HazardIncident[];
  quakes: HazardIncident[];
  fire: HazardIncident[];
}

export interface HazardAreaInfo {
  flood: HazardIncident[];
  quakes: HazardIncident[];
  floodActionable: number;
  quakeCount: number;
  radiusMiles: number;
}

export interface CameraFeedDto {
  id: string;
  title: string;
  region: string;
  description: string;
  status: string;
  type: 'iframe' | 'image';
  group: 'cams' | 'satellite' | 'radar';
  imageUrl?: string;
  embedUrl?: string;
  attribution: string;
  sourceUrl?: string;
  lat?: number;
  lng?: number;
  km?: number;
  category?: string;
  health?: 'ok' | 'stale' | 'black' | 'pending' | 'error' | string;
  lastUpdated?: string;
  ageSec?: number;
  blackFrame?: boolean;
  corridorId?: string;
  corridorLabel?: string;
  nearAlertIds?: string[];
  nearAlertCount?: number;
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

  getCams(): Observable<CameraFeedDto[]> {
    return this.http.get<CameraFeedDto[]>('/api/cams').pipe(
      catchError(err => {
        console.error('getCams error:', err);
        return of([]);
      })
    );
  }

  getCamsNearWarnings(): Observable<{
    generatedAt: string;
    radiusMiles: number;
    count: number;
    items: { camera: CameraFeedDto; nearAlertIds: string[]; nearAlertCount: number }[];
    note?: string;
  } | null> {
    return this.http.get<{
      generatedAt: string;
      radiusMiles: number;
      count: number;
      items: { camera: CameraFeedDto; nearAlertIds: string[]; nearAlertCount: number }[];
      note?: string;
    }>('/api/cams/near-warnings').pipe(
      catchError(() => of(null)),
    );
  }

  /** IEM Local Storm Reports — Maine + nearby, last N hours. */
  getLsrGeoJson(hours = 24): Observable<GeoJSON.FeatureCollection> {
    const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
    const url =
      `https://mesonet.agron.iastate.edu/geojson/lsr.geojson?states=ME&hours=${hours}`;
    return this.http.get<GeoJSON.FeatureCollection>(url).pipe(
      catchError(err => {
        console.error('getLsrGeoJson error:', err);
        return of(empty);
      })
    );
  }

  /** SPC Day-1 categorical outlook polygons. */
  getSpcOutlook(): Observable<GeoJSON.FeatureCollection> {
    const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
    const url = 'https://www.spc.noaa.gov/products/outlook/day1otlk_cat.nolyr.geojson';
    return this.http.get<GeoJSON.FeatureCollection>(url).pipe(
      catchError(err => {
        console.error('getSpcOutlook error:', err);
        return of(empty);
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

  saveQuizAttempt(attempt: {
    playerName: string;
    category: string;
    score: number;
    total: number;
    seconds: number;
  }): Observable<{ attempt: QuizAttempt; unlocked: string[]; award?: QuizAward | null } | null> {
    return this.http.post<{ attempt: QuizAttempt; unlocked: string[]; award?: QuizAward | null } | QuizAttempt>(
      '/api/quiz/attempts',
      attempt,
    ).pipe(
      map(res => {
        if (res && 'attempt' in res) {
          return res as { attempt: QuizAttempt; unlocked: string[]; award?: QuizAward | null };
        }
        if (res && 'id' in res) return { attempt: res as QuizAttempt, unlocked: [], award: null };
        return null;
      }),
      catchError(err => {
        console.error('saveQuizAttempt error:', err);
        return of(null);
      })
    );
  }

  getQuizLeaderboard(category?: string): Observable<QuizAttempt[]> {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.http.get<QuizAttempt[]>(`/api/quiz/leaderboard${q}`).pipe(
      catchError(err => {
        console.error('getQuizLeaderboard error:', err);
        return of([]);
      })
    );
  }

  getMyQuizAttempts(): Observable<QuizAttempt[]> {
    return this.http.get<QuizAttempt[]>('/api/quiz/mine').pipe(
      catchError(() => of([]))
    );
  }

  getChaseCatalog(): Observable<ChaseLootDef[]> {
    return this.http.get<ChaseLootDef[]>('/api/chase/catalog').pipe(
      catchError(() => of([]))
    );
  }

  getMyLoot(): Observable<ChaseLootItem[]> {
    return this.http.get<ChaseLootItem[]>('/api/chase/loot').pipe(
      catchError(() => of([]))
    );
  }

  saveChaseRun(run: { items: string[]; seconds: number }): Observable<{
    items: string[];
    inventory: ChaseLootItem[];
    award?: QuizAward | null;
    unlocked: string[];
  } | null> {
    return this.http.post<{
      items: string[];
      inventory: ChaseLootItem[];
      award?: QuizAward | null;
      unlocked: string[];
    }>('/api/chase/runs', run).pipe(
      catchError(err => {
        console.error('saveChaseRun error:', err);
        return of(null);
      })
    );
  }

  getSavedLocations(): Observable<SavedLocation[]> {
    return this.http.get<SavedLocation[]>('/api/locations').pipe(
      catchError(err => {
        console.error('getSavedLocations error:', err);
        return of([]);
      })
    );
  }

  createSavedLocation(loc: { label: string; lat: number; lon: number }): Observable<SavedLocation> {
    return this.http.post<SavedLocation>('/api/locations', loc).pipe(
      catchError(err => {
        console.error('createSavedLocation error:', err);
        return of(null as unknown as SavedLocation);
      })
    );
  }

  deleteSavedLocation(id: string): Observable<void> {
    return this.http.delete<void>(`/api/locations/${id}`).pipe(
      catchError(err => {
        console.error('deleteSavedLocation error:', err);
        return of(undefined);
      })
    );
  }

  getFavorites(): Observable<string[]> {
    return this.http.get<{ cameraIds: string[] }>('/api/favorites').pipe(
      map(r => r.cameraIds || []),
      catchError(() => of([]))
    );
  }

  addFavorite(cameraId: string): Observable<void> {
    return this.http.post<void>('/api/favorites', { cameraId }).pipe(
      catchError(() => of(undefined))
    );
  }

  removeFavorite(cameraId: string): Observable<void> {
    return this.http.delete<void>(`/api/favorites/${encodeURIComponent(cameraId)}`).pipe(
      catchError(() => of(undefined))
    );
  }

  getWatchedAreas(): Observable<WatchedArea[]> {
    return this.http.get<WatchedArea[]>('/api/watched-areas').pipe(
      catchError(() => of([]))
    );
  }

  createWatchedArea(body: { label: string; lat: number; lon: number; radiusMiles: number }): Observable<WatchedArea> {
    return this.http.post<WatchedArea>('/api/watched-areas', body).pipe(
      catchError(() => of(null as unknown as WatchedArea))
    );
  }

  deleteWatchedArea(id: string): Observable<void> {
    return this.http.delete<void>(`/api/watched-areas/${id}`).pipe(
      catchError(() => of(undefined))
    );
  }

  expandWatchedArea(id: string): Observable<{
    area: WatchedArea;
    alerts: WeatherAlert[];
    count: number;
    outage?: AreaOutageInfo;
    cams?: CameraFeedDto[];
    hazards?: HazardAreaInfo;
  }> {
    return this.http.get<{
      area: WatchedArea;
      alerts: WeatherAlert[];
      count: number;
      outage?: AreaOutageInfo;
      cams?: CameraFeedDto[];
      hazards?: HazardAreaInfo;
    }>(`/api/watched-areas/${id}/expand`).pipe(
      catchError(() => of({ area: null as any, alerts: [], count: 0 })),
    );
  }

  getOutages(): Observable<OutageSnapshot | null> {
    return this.http.get<OutageSnapshot>('/api/outages').pipe(
      catchError(() => of(null)),
    );
  }

  getOutagesGeo(): Observable<GeoJSON.FeatureCollection | null> {
    return this.http.get<GeoJSON.FeatureCollection>('/api/outages/geo').pipe(
      catchError(() => of(null)),
    );
  }

  getRadarStatus(lat?: number, lon?: number): Observable<RadarStatus | null> {
    const params: string[] = [];
    if (typeof lat === 'number') params.push(`lat=${lat}`);
    if (typeof lon === 'number') params.push(`lon=${lon}`);
    const q = params.length ? `?${params.join('&')}` : '';
    return this.http.get<RadarStatus>(`/api/radar/status${q}`).pipe(
      catchError(() => of(null)),
    );
  }

  getRadarScans(radar: string, product: string, hours = 2): Observable<RadarScansResponse | null> {
    const q = `?radar=${encodeURIComponent(radar)}&product=${encodeURIComponent(product)}&hours=${hours}`;
    return this.http.get<RadarScansResponse>(`/api/radar/scans${q}`).pipe(
      catchError(() => of(null)),
    );
  }

  getHazards(): Observable<HazardSnapshot | null> {
    return this.http.get<HazardSnapshot>('/api/hazards').pipe(
      catchError(() => of(null)),
    );
  }

  getHazardsGeo(kind?: string): Observable<GeoJSON.FeatureCollection | null> {
    const q = kind ? `?kind=${encodeURIComponent(kind)}` : '';
    return this.http.get<GeoJSON.FeatureCollection>(`/api/hazards/geo${q}`).pipe(
      catchError(() => of(null)),
    );
  }

  getDashboardPrefs(): Observable<DashboardPrefs> {
    return this.http.get<DashboardPrefs>('/api/dashboard/prefs').pipe(
      catchError(() => of({
        cardOrder: 'profile,progress,garage,cams,areas,map',
        hiddenCards: '',
        mapLayers: 'radar,warnings,cams',
      }))
    );
  }

  saveDashboardPrefs(prefs: DashboardPrefs): Observable<DashboardPrefs> {
    return this.http.put<DashboardPrefs>('/api/dashboard/prefs', prefs).pipe(
      catchError(() => of(prefs))
    );
  }

  getVehicleCatalog(): Observable<VehicleDef[]> {
    return this.http.get<VehicleDef[]>('/api/vehicles').pipe(
      catchError(() => of([]))
    );
  }
}

export interface QuizAttempt {
  id: string;
  playerName: string;
  category: string;
  score: number;
  total: number;
  seconds: number;
  createdAt: string;
  userId?: string;
}

export interface QuizAward {
  xpGained: number;
  xp: number;
  level: number;
  prevLevel: number;
  levelUp: boolean;
  xpIntoLevel: number;
  xpForNext: number;
  title: string;
}

export interface ChaseLootDef {
  key: string;
  name: string;
  blurb: string;
  rarity: string;
  xp: number;
}

export interface ChaseLootItem extends ChaseLootDef {
  count: number;
}

export interface SavedLocation {
  id: string;
  label: string;
  lat: number;
  lon: number;
  userId?: string;
}

export interface WatchedArea {
  id: string;
  userId: string;
  label: string;
  lat: number;
  lon: number;
  radiusMiles: number;
  createdAt: string;
}

export interface DashboardPrefs {
  cardOrder: string;
  hiddenCards: string;
  mapLayers: string;
}

export interface VehicleDef {
  key: string;
  name: string;
  blurb: string;
  unlockHint: string;
  minLevel?: number;
}
