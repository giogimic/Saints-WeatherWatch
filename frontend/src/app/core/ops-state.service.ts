import { Injectable, computed, inject, signal } from '@angular/core';
import { EMPTY, Subscription, switchMap, timer } from 'rxjs';
import {
  CameraFeedDto,
  OverviewFreshness,
  QuizAttempt,
  SavedLocation,
  WatchedArea,
  WeatherAlert,
  WeatherAlertsResponse,
  WeatherOverviewResponse,
  WeatherService,
} from './weather.service';
import { AuthService } from './auth.service';
import { RealtimeService } from './realtime.service';

const DEFAULT_ATTRIBUTION =
  'NWS alerts · ODIN county outages · IEM radar · NOAA NWPS gauges · USGS quakes · public cams';

/**
 * Shared live ops cache so Dashboard / Map / Live / Alerts feel like one app
 * instead of refetching empty shells on every route change.
 */
@Injectable({ providedIn: 'root' })
export class OpsStateService {
  private readonly weather = inject(WeatherService);
  private readonly auth = inject(AuthService);
  private readonly realtime = inject(RealtimeService);
  private started = false;
  private sub?: Subscription;
  private overviewSub?: Subscription;
  private bannerTimer?: ReturnType<typeof setTimeout>;
  private accountTimer?: ReturnType<typeof setInterval>;

  readonly alerts = signal<WeatherAlert[]>([]);
  readonly alertsGeneratedAt = signal('');
  readonly alertsStale = signal(false);
  readonly cams = signal<CameraFeedDto[]>([]);
  readonly favoriteCamIds = signal<string[]>([]);
  readonly watchedAreas = signal<WatchedArea[]>([]);
  readonly savedLocations = signal<SavedLocation[]>([]);
  readonly myAttempts = signal<QuizAttempt[]>([]);
  readonly refreshing = signal(false);
  /** Newest warning pushed over WebSocket (banner). */
  readonly bannerAlert = signal<WeatherAlert | null>(null);
  readonly wsConnected = this.realtime.connected;
  /** Phase E — Impact mode focuses ops surfaces on warnings/outages/flood/cams. */
  readonly impactMode = signal(false);
  /** Phase F — feed freshness + attribution. */
  readonly freshness = signal<OverviewFreshness | null>(null);
  readonly attribution = signal(DEFAULT_ATTRIBUTION);
  readonly policyNote = signal('');
  readonly anyStale = computed(() => {
    const f = this.freshness();
    return !!(f?.anyStale || this.alertsStale());
  });
  readonly staleSummary = computed(() => {
    if (!this.anyStale()) return null;
    const f = this.freshness();
    const parts: string[] = [];
    if (f?.alerts?.stale || this.alertsStale()) parts.push('alerts');
    if (f?.outages?.stale) parts.push('outages');
    if (f?.hazards?.stale) parts.push('hazards');
    if (!parts.length && !this.wsConnected()) parts.push('live link');
    return parts.length ? parts.join(' · ') : 'feeds';
  });

  start(): void {
    if (this.started) return;
    this.started = true;
    try {
      this.impactMode.set(sessionStorage.getItem('ww-impact-mode') === '1');
    } catch { /* ignore */ }

    // HTTP poll as fallback (slower when WS is healthy).
    this.sub = timer(0, 60_000).pipe(
      switchMap((tick) => {
        // First tick always loads via HTTP; later ticks skip when WS is healthy.
        if (tick > 0 && this.realtime.connected() && this.alerts().length > 0) {
          return EMPTY;
        }
        this.refreshing.set(true);
        return this.weather.getAlerts();
      }),
    ).subscribe({
      next: (res: WeatherAlertsResponse) => {
        this.applyAlerts(res.alerts || [], res.generatedAt || '', !!res.stale);
        this.refreshing.set(false);
      },
      error: () => this.refreshing.set(false),
    });

    this.overviewSub = timer(0, 60_000).pipe(
      switchMap(() => this.weather.getOverview()),
    ).subscribe({
      next: (ov: WeatherOverviewResponse) => this.applyOverview(ov),
      error: () => { /* keep last-good */ },
    });

    this.realtime.connect(env => {
      if (env.type === 'ping') return;
      if (env.type === 'snapshot' || env.type === 'new_alerts') {
        if (env.alerts) {
          this.applyAlerts(env.alerts, env.generatedAt || '', false);
        }
      }
      if (env.type === 'new_alerts' && env.newAlerts?.length) {
        this.showBanner(this.pickBannerAlert(env.newAlerts));
      }
    });

    this.weather.getCams().subscribe(list => this.cams.set(list || []));
    const tick = () => this.reloadAccountData();
    tick();
    this.accountTimer = setInterval(() => {
      if (this.auth.isLoggedIn()) this.reloadAccountData();
    }, 90_000);
  }

  reloadAccountData(): void {
    if (!this.auth.isLoggedIn()) {
      this.favoriteCamIds.set([]);
      this.watchedAreas.set([]);
      this.savedLocations.set([]);
      this.myAttempts.set([]);
      return;
    }
    this.weather.getFavorites().subscribe(ids => this.favoriteCamIds.set(ids));
    this.weather.getWatchedAreas().subscribe(rows => this.watchedAreas.set(rows || []));
    this.weather.getSavedLocations().subscribe(rows => this.savedLocations.set(rows || []));
    this.weather.getMyQuizAttempts().subscribe(rows => this.myAttempts.set(rows || []));
  }

  toggleFavorite(cameraId: string): void {
    const has = this.favoriteCamIds().includes(cameraId);
    if (has) {
      this.weather.removeFavorite(cameraId).subscribe(() => {
        this.favoriteCamIds.set(this.favoriteCamIds().filter(id => id !== cameraId));
      });
    } else {
      this.weather.addFavorite(cameraId).subscribe(() => {
        this.favoriteCamIds.set([...this.favoriteCamIds(), cameraId]);
      });
    }
  }

  dismissBanner(): void {
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerAlert.set(null);
  }

  setImpactMode(on: boolean): void {
    this.impactMode.set(on);
    try {
      sessionStorage.setItem('ww-impact-mode', on ? '1' : '0');
    } catch { /* ignore */ }
  }

  toggleImpactMode(): void {
    this.setImpactMode(!this.impactMode());
  }

  stop(): void {
    this.sub?.unsubscribe();
    this.overviewSub?.unsubscribe();
    if (this.accountTimer) clearInterval(this.accountTimer);
    this.accountTimer = undefined;
    this.realtime.disconnect();
    this.dismissBanner();
    this.started = false;
  }

  private applyOverview(ov: WeatherOverviewResponse): void {
    if (ov.freshness) this.freshness.set(ov.freshness);
    if (ov.attribution) this.attribution.set(ov.attribution);
    if (ov.policyNote) this.policyNote.set(ov.policyNote);
    if (ov.freshness?.alerts?.stale != null) {
      this.alertsStale.set(!!ov.freshness.alerts.stale);
    }
  }

  private applyAlerts(alerts: WeatherAlert[], generatedAt: string, stale: boolean): void {
    this.alerts.set(alerts);
    if (generatedAt) this.alertsGeneratedAt.set(generatedAt);
    this.alertsStale.set(stale);
  }

  private pickBannerAlert(list: WeatherAlert[]): WeatherAlert {
    const rank = (s: string) => {
      switch ((s || '').toLowerCase()) {
        case 'extreme': return 4;
        case 'severe': return 3;
        case 'moderate': return 2;
        case 'elevated': return 1;
        default: return 0;
      }
    };
    return [...list].sort((a, b) => rank(b.severity) - rank(a.severity))[0];
  }

  private showBanner(alert: WeatherAlert): void {
    this.bannerAlert.set(alert);
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.bannerAlert.set(null), 20_000);
  }
}
