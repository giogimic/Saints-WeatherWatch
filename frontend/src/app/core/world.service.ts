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
  zone?: string;
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

export interface WorldLobby {
  id: string;
  name: string;
  blurb: string;
  maxPlayers: number;
  players: number;
  full: boolean;
}

export interface WorldZone {
  id: string;
  name: string;
  blurb: string;
}

export interface WorldEnvelope {
  type: string;
  players?: WorldPlayer[];
  drops?: WorldDrop[];
  dropId?: string;
  itemKey?: string;
  event?: WorldEvent;
  toast?: string;
  lobbyId?: string;
  lobbyName?: string;
  you?: WorldPlayer;
  chat?: WorldChatLine;
  chats?: WorldChatLine[];
}

export interface WorldChatLine {
  id: string;
  userId: string;
  name: string;
  text: string;
  at: number;
}

/**
 * Storm World REST + WebSocket client.
 * Reconnect mirrors RealtimeService: single timer, backoff, teardown handlers,
 * pause while the tab is hidden — avoids stacked reconnects that look like leaks.
 */
@Injectable({ providedIn: 'root' })
export class WorldService {
  private readonly http = inject(HttpClient);

  readonly players = signal<WorldPlayer[]>([]);
  readonly drops = signal<WorldDrop[]>([]);
  readonly event = signal<WorldEvent | null>(null);
  readonly toast = signal('');
  readonly connected = signal(false);
  readonly lobbyId = signal('main');
  readonly lobbyName = signal('');
  /** Server-assigned spawn (rendezvous near peers). */
  readonly you = signal<WorldPlayer | null>(null);
  readonly chatLines = signal<WorldChatLine[]>([]);
  /** Latest successful server bag (for UI). */
  readonly lastBag = signal<{ seq: number; itemKey: string; dropId?: string } | null>(null);

  private socket?: WebSocket;
  private intentionalClose = true; // idle until Play explicitly connects
  private opening = false;
  private retryMs = 2000;
  private failCount = 0;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private toastTimer?: ReturnType<typeof setTimeout>;
  private lastLat = 47.05;
  private lastLng = -68.35;
  private lastMoveSent = 0;
  private bagSeq = 0;
  private visibilityBound = false;
  private selectedLobby = 'main';
  private socketLobby = '';

  getCatalog(): Observable<{ items: WorldItem[]; recipes: WorldRecipe[]; bounds: Record<string, number>; zones?: WorldZone[] }> {
    return this.http.get<{ items: WorldItem[]; recipes: WorldRecipe[]; bounds: Record<string, number>; zones?: WorldZone[] }>('/api/world/catalog').pipe(
      catchError(() => of({ items: [], recipes: [], bounds: {} })),
    );
  }

  getLobbies(): Observable<{ lobbies: WorldLobby[]; zones: WorldZone[] }> {
    return this.http.get<{ lobbies: WorldLobby[]; zones: WorldZone[] }>('/api/world/lobbies').pipe(
      catchError(() => of({ lobbies: [], zones: [] })),
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

  connectWorld(lat?: number, lng?: number, lobbyId?: string): void {
    if (typeof lat === 'number' && typeof lng === 'number') {
      this.lastLat = lat;
      this.lastLng = lng;
    }
    if (lobbyId) {
      this.selectedLobby = lobbyId;
      this.lobbyId.set(lobbyId);
    }
    this.intentionalClose = false;
    this.bindVisibility();
    // Lobby change on a live socket must reopen — hello alone cannot switch shards.
    const want = this.selectedLobby || 'main';
    if (this.socket && this.socketLobby && this.socketLobby !== want) {
      this.teardownSocket();
      this.opening = false;
    }
    this.open();
  }

  disconnectWorld(): void {
    this.intentionalClose = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    this.opening = false;
    this.failCount = 0;
    this.retryMs = 2000;
    this.teardownSocket();
    this.connected.set(false);
    this.players.set([]);
    this.drops.set([]);
    this.event.set(null);
    this.you.set(null);
    this.chatLines.set([]);
    this.lobbyName.set('');
    this.socketLobby = '';
  }

  sendMove(lat: number, lng: number): void {
    this.lastLat = lat;
    this.lastLng = lng;
    const now = Date.now();
    if (now - this.lastMoveSent < 80) return;
    this.lastMoveSent = now;
    this.send({ type: 'move', lat, lng });
  }

  sendPickup(dropId: string, lat: number, lng: number): void {
    this.lastLat = lat;
    this.lastLng = lng;
    this.send({ type: 'pickup', dropId, lat, lng });
  }

  sendEventPlace(eventId: string, lat: number, lng: number): void {
    this.lastLat = lat;
    this.lastLng = lng;
    this.send({ type: 'event_place', eventId, lat, lng });
  }

  sendChat(text: string): void {
    const t = text.trim();
    if (!t) return;
    this.send({ type: 'chat', text: t.slice(0, 140) });
  }

  private bindVisibility(): void {
    if (this.visibilityBound || typeof document === 'undefined') return;
    this.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (this.intentionalClose) return;
      if (document.visibilityState === 'hidden') return;
      this.failCount = Math.min(this.failCount, 3);
      this.retryMs = 2000;
      this.open();
    });
  }

  private open(): void {
    if (this.intentionalClose || this.opening) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.scheduleReconnect();
      return;
    }
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.send({ type: 'hello', lat: this.lastLat, lng: this.lastLng });
      }
      return;
    }

    this.opening = true;
    this.teardownSocket();

    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const lobby = encodeURIComponent(this.selectedLobby || 'main');
      const ws = new WebSocket(`${proto}//${window.location.host}/api/world/ws?lobby=${lobby}`);
      this.socket = ws;
      this.socketLobby = this.selectedLobby || 'main';

      ws.onopen = () => {
        this.opening = false;
        this.connected.set(true);
        this.failCount = 0;
        this.retryMs = 2000;
        this.send({ type: 'hello', lat: this.lastLat, lng: this.lastLng });
      };
      ws.onmessage = (ev) => {
        try {
          const env = JSON.parse(String(ev.data)) as WorldEnvelope;
          this.apply(env);
        } catch { /* ignore */ }
      };
      ws.onclose = () => {
        this.opening = false;
        this.connected.set(false);
        if (this.socket === ws) this.socket = undefined;
        this.failCount += 1;
        this.scheduleReconnect();
      };
      ws.onerror = () => {
        try { ws.close(); } catch { /* ignore */ }
      };
    } catch {
      this.opening = false;
      this.failCount += 1;
      this.scheduleReconnect();
    }
  }

  private teardownSocket(): void {
    if (!this.socket) return;
    const ws = this.socket;
    this.socket = undefined;
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    try {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    } catch { /* ignore */ }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose) return;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const cap = this.failCount >= 8 ? 120_000 : 45_000;
    const wait = Math.min(cap, this.retryMs);
    this.retryMs = Math.min(cap, Math.round(this.retryMs * 1.7));
    this.retryTimer = setTimeout(() => this.open(), wait);
  }

  private send(payload: Record<string, unknown>): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  private apply(env: WorldEnvelope): void {
    if (env.lobbyId) this.lobbyId.set(env.lobbyId);
    if (env.lobbyName) this.lobbyName.set(env.lobbyName);
    if (env.type === 'snapshot' || env.type === 'presence') {
      this.players.set(env.players ?? []);
    }
    if (env.type === 'snapshot' && env.you) {
      this.you.set(env.you);
      this.lastLat = env.you.lat;
      this.lastLng = env.you.lng;
    }
    if (env.type === 'snapshot' && env.chats) {
      this.chatLines.set(env.chats);
    }
    if (env.type === 'chat' && env.chat) {
      const line = env.chat;
      this.chatLines.update(list => {
        if (list.some(x => x.id === line.id)) return list;
        return [...list, line].slice(-40);
      });
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
      if (env.itemKey) {
        this.bagSeq += 1;
        this.lastBag.set({ seq: this.bagSeq, itemKey: env.itemKey, dropId: env.dropId });
      }
    }
    if (env.type === 'toast' && env.toast) {
      this.flash(env.toast);
      if (env.itemKey && (env.toast.startsWith('Bagged ') || env.toast.startsWith('Event secured'))) {
        this.bagSeq += 1;
        this.lastBag.set({ seq: this.bagSeq, itemKey: env.itemKey, dropId: env.dropId });
      }
    }
  }

  private flash(msg: string): void {
    this.toast.set(msg);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 2200);
  }
}
