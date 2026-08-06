import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

export interface WorldItem {
  key: string;
  name: string;
  blurb?: string;
  rarity: string;
  kind?: string;
  count?: number;
  xp?: number;
}

export interface WorldRecipe {
  id: string;
  name: string;
  blurb: string;
  inputs: { key: string; qty: number }[];
  output: { key: string; qty: number };
  minLevel: number;
}

export interface TradeListing {
  id: string;
  sellerId: string;
  offerKey: string;
  offerQty: number;
  askKey: string;
  askQty: number;
  status: string;
  createdAt?: string;
}

export interface WorldPlayer {
  userId: string;
  chaserName: string;
  vehicleKey: string;
  lat: number;
  lng: number;
}

export interface WorldDrop {
  id: string;
  itemKey: string;
  name: string;
  rarity: string;
  lat: number;
  lng: number;
}

export interface WorldEvent {
  id: string;
  label: string;
  blurb: string;
  simulated: boolean;
  lat: number;
  lng: number;
  rewardKey: string;
  active: boolean;
}

export interface WorldEnvelope {
  type: string;
  players?: WorldPlayer[];
  drops?: WorldDrop[];
  dropId?: string;
  event?: WorldEvent;
  toast?: string;
}

@Injectable({ providedIn: 'root' })
export class WorldService {
  private readonly http = inject(HttpClient);

  readonly players = signal<WorldPlayer[]>([]);
  readonly drops = signal<WorldDrop[]>([]);
  readonly event = signal<WorldEvent | null>(null);
  readonly toast = signal('');
  readonly connected = signal(false);

  private socket?: WebSocket;
  private intentionalClose = false;
  private toastTimer?: ReturnType<typeof setTimeout>;

  getCatalog(): Observable<{ items: WorldItem[]; recipes: WorldRecipe[]; bounds: Record<string, number> }> {
    return this.http.get<{ items: WorldItem[]; recipes: WorldRecipe[]; bounds: Record<string, number> }>('/api/world/catalog').pipe(
      catchError(() => of({ items: [], recipes: [], bounds: {} })),
    );
  }

  getInventory(): Observable<WorldItem[]> {
    return this.http.get<WorldItem[]>('/api/world/inventory').pipe(catchError(() => of([])));
  }

  refreshInventory(): Observable<WorldItem[]> {
    return this.getInventory();
  }

  craft(recipeId: string): Observable<{ ok?: boolean; inventory?: WorldItem[]; error?: string } | null> {
    return this.http.post<{ ok?: boolean; inventory?: WorldItem[] }>('/api/world/craft', { recipeId }).pipe(
      catchError(() => of(null)),
    );
  }

  getTrades(): Observable<TradeListing[]> {
    return this.http.get<TradeListing[]>('/api/world/trades').pipe(catchError(() => of([])));
  }

  createTrade(body: { offerKey: string; offerQty: number; askKey: string; askQty: number }): Observable<TradeListing | null> {
    return this.http.post<TradeListing>('/api/world/trades', body).pipe(catchError(() => of(null)));
  }

  buyTrade(id: string): Observable<{ ok?: boolean; inventory?: WorldItem[] } | null> {
    return this.http.post<{ ok?: boolean; inventory?: WorldItem[] }>(`/api/world/trades/${id}/buy`, {}).pipe(
      catchError(() => of(null)),
    );
  }

  cancelTrade(id: string): Observable<boolean> {
    return this.http.delete(`/api/world/trades/${id}`, { observe: 'response' }).pipe(
      map(res => res.status >= 200 && res.status < 300),
      catchError(() => of(false)),
    );
  }

  connectWorld(): void {
    this.intentionalClose = false;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/api/world/ws`);
    this.socket = ws;
    ws.onopen = () => {
      this.connected.set(true);
      this.send({ type: 'hello', lat: 47.05, lng: -68.35 });
    };
    ws.onmessage = (ev) => {
      try {
        const env = JSON.parse(String(ev.data)) as WorldEnvelope;
        this.apply(env);
      } catch { /* ignore */ }
    };
    ws.onclose = () => {
      this.connected.set(false);
      this.socket = undefined;
      if (!this.intentionalClose) {
        setTimeout(() => this.connectWorld(), 4000);
      }
    };
    ws.onerror = () => {
      try { ws.close(); } catch { /* ignore */ }
    };
  }

  disconnectWorld(): void {
    this.intentionalClose = true;
    try { this.socket?.close(); } catch { /* ignore */ }
    this.socket = undefined;
    this.connected.set(false);
  }

  sendMove(lat: number, lng: number): void {
    this.send({ type: 'move', lat, lng });
  }

  sendPickup(dropId: string): void {
    this.send({ type: 'pickup', dropId });
  }

  sendEventPlace(eventId: string): void {
    this.send({ type: 'event_place', eventId });
  }

  private send(payload: Record<string, unknown>): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  private apply(env: WorldEnvelope): void {
    if (env.type === 'snapshot' || env.type === 'presence') {
      if (env.players) this.players.set(env.players);
    }
    if (env.type === 'snapshot' || env.type === 'drops') {
      if (env.drops) this.drops.set(env.drops);
    }
    if (env.type === 'drop_gone' && env.dropId) {
      this.drops.set(this.drops().filter(d => d.id !== env.dropId));
    }
    if (env.type === 'event' || env.type === 'snapshot') {
      this.event.set(env.event ?? null);
    }
    if (env.type === 'event_done') {
      this.event.set(null);
      if (env.toast) this.flash(env.toast);
    }
    if (env.type === 'toast' && env.toast) this.flash(env.toast);
  }

  private flash(msg: string): void {
    this.toast.set(msg);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 2200);
  }
}
