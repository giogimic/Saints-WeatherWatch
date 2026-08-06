import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

export interface LootItem {
  key: string;
  name: string;
  blurb: string;
  rarity: string;
  count: number;
  xp: number;
}

export interface ChaserUser {
  id: string;
  chaserName: string;
  email?: string | null;
  equippedVehicleKey: string;
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  levelTitle: string;
  createdAt: string;
  vehicleKeys: string[];
  loot?: LootItem[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  readonly user = signal<ChaserUser | null>(null);
  readonly ready = signal(false);
  readonly modalOpen = signal(false);
  readonly modalMode = signal<'login' | 'signup'>('login');
  /** Pending quiz payload to save after guest registers/logs in */
  pendingQuiz: {
    category: string;
    score: number;
    total: number;
    seconds: number;
    playerName: string;
  } | null = null;

  /** Pending Radar Chase loot to save after guest registers/logs in */
  pendingChase: {
    items: string[];
    seconds: number;
  } | null = null;

  readonly isLoggedIn = computed(() => !!this.user());

  bootstrap(): void {
    this.http.get<{ user: ChaserUser | null }>('/api/auth/me').pipe(
      catchError(() => of({ user: null })),
    ).subscribe(res => {
      this.user.set(res.user ?? null);
      this.ready.set(true);
    });
  }

  openModal(mode: 'login' | 'signup' = 'login'): void {
    this.modalMode.set(mode);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  signup(chaserName: string, pin: string, email?: string): Observable<ChaserUser> {
    return this.http.post<ChaserUser>('/api/auth/signup', { chaserName, pin, email: email || undefined }).pipe(
      tap(u => {
        this.user.set(u);
        this.closeModal();
      }),
    );
  }

  login(chaserName: string, pin: string): Observable<ChaserUser> {
    return this.http.post<ChaserUser>('/api/auth/login', { chaserName, pin }).pipe(
      tap(u => {
        this.user.set(u);
        this.closeModal();
      }),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}).pipe(
      catchError(() => of(undefined)),
      tap(() => this.user.set(null)),
      map(() => undefined),
    );
  }

  refreshMe(): Observable<ChaserUser | null> {
    return this.http.get<{ user: ChaserUser | null }>('/api/auth/me').pipe(
      catchError(() => of({ user: null })),
      tap(res => this.user.set(res.user ?? null)),
      map(res => res.user ?? null),
    );
  }

  equipVehicle(vehicleKey: string): Observable<ChaserUser> {
    return this.http.post<ChaserUser>('/api/vehicles/equip', { vehicleKey }).pipe(
      tap(u => this.user.set(u)),
    );
  }
}
