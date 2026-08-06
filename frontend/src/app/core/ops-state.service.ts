import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, Subscription, switchMap, timer } from 'rxjs';
import {
  CameraFeedDto,
  QuizAttempt,
  SavedLocation,
  WatchedArea,
  WeatherAlert,
  WeatherAlertsResponse,
  WeatherService,
} from './weather.service';
import { AuthService } from './auth.service';
import { RealtimeService } from './realtime.service';

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
  private bannerTimer?: ReturnType<typeof setTimeout>;
  private accountTimer?: ReturnType<typeof setInterval>;

  readonly alerts = signal<WeatherAlert[]>([]);
  readonly alertsGeneratedAt = signal('');
  readonly cams = signal<CameraFeedDto[]>([]);
  readonly favoriteCamIds = signal<string[]>([]);
  readonly watchedAreas = signal<WatchedArea[]>([]);
  readonly savedLocations = signal<SavedLocation[]>([]);
  readonly myAttempts = signal<QuizAttempt[]>([]);
  readonly refreshing = signal(false);
  /** Newest warning pushed over WebSocket (banner). */
  readonly bannerAlert = signal<WeatherAlert | null>(null);
  readonly wsConnected = this.realtime.connected;

  start(): void {
    if (this.started) return;
    this.started = true;

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
        this.applyAlerts(res.alerts || [], res.generatedAt || '');
        this.refreshing.set(false);
      },
      error: () => this.refreshing.set(false),
    });

    this.realtime.connect(env => {
      if (env.type === 'ping') return;
      if (env.type === 'snapshot' || env.type === 'new_alerts') {
        if (env.alerts) {
          this.applyAlerts(env.alerts, env.generatedAt || '');
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

  stop(): void {
    this.sub?.unsubscribe();
    if (this.accountTimer) clearInterval(this.accountTimer);
    this.accountTimer = undefined;
    this.realtime.disconnect();
    this.dismissBanner();
    this.started = false;
  }

  private applyAlerts(alerts: WeatherAlert[], generatedAt: string): void {
    this.alerts.set(alerts);
    if (generatedAt) this.alertsGeneratedAt.set(generatedAt);
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
