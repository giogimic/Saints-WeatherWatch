import { Injectable, inject, signal } from '@angular/core';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
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

/**
 * Shared live ops cache so Dashboard / Map / Live / Alerts feel like one app
 * instead of refetching empty shells on every route change.
 */
@Injectable({ providedIn: 'root' })
export class OpsStateService {
  private readonly weather = inject(WeatherService);
  private readonly auth = inject(AuthService);
  private started = false;
  private sub?: Subscription;

  readonly alerts = signal<WeatherAlert[]>([]);
  readonly alertsGeneratedAt = signal('');
  readonly cams = signal<CameraFeedDto[]>([]);
  readonly favoriteCamIds = signal<string[]>([]);
  readonly watchedAreas = signal<WatchedArea[]>([]);
  readonly savedLocations = signal<SavedLocation[]>([]);
  readonly myAttempts = signal<QuizAttempt[]>([]);
  readonly refreshing = signal(false);

  start(): void {
    if (this.started) return;
    this.started = true;
    this.sub = interval(60_000).pipe(
      startWith(0),
      switchMap(() => {
        this.refreshing.set(true);
        return this.weather.getAlerts();
      }),
    ).subscribe({
      next: (res: WeatherAlertsResponse) => {
        this.alerts.set(res.alerts || []);
        this.alertsGeneratedAt.set(res.generatedAt || '');
        this.refreshing.set(false);
      },
      error: () => this.refreshing.set(false),
    });

    this.weather.getCams().subscribe(list => this.cams.set(list || []));
    // Reload account-owned caches when auth changes
    const tick = () => this.reloadAccountData();
    tick();
    // Poll auth-tied data less often
    setInterval(() => {
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

  stop(): void {
    this.sub?.unsubscribe();
    this.started = false;
  }
}
