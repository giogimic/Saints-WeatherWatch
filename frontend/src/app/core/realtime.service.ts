import { Injectable, signal } from '@angular/core';
import { WeatherAlert } from './weather.service';

export interface RealtimeEnvelope {
  type: 'snapshot' | 'new_alerts' | 'ping';
  generatedAt?: string;
  alerts?: WeatherAlert[];
  newAlerts?: WeatherAlert[];
}

/**
 * WebSocket client for Phase 4 live alert pushes.
 * Reconnects with backoff; OpsState keeps HTTP polling as fallback.
 *
 * Prefers `/api/ws` (works when edge proxies only forward `/api`),
 * then falls back to `/ws`.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  readonly connected = signal(false);
  readonly lastEventAt = signal('');
  readonly failing = signal(false);

  private socket?: WebSocket;
  private intentionalClose = false;
  private opening = false;
  private retryMs = 2000;
  private failCount = 0;
  private pathIndex = 0;
  private readonly paths = ['/api/ws', '/ws'];
  private retryTimer?: ReturnType<typeof setTimeout>;
  private onMessage?: (env: RealtimeEnvelope) => void;
  private visibilityBound = false;

  connect(handler: (env: RealtimeEnvelope) => void): void {
    this.onMessage = handler;
    this.intentionalClose = false;
    this.bindVisibility();
    this.open();
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    this.opening = false;
    this.teardownSocket();
    this.connected.set(false);
  }

  private bindVisibility(): void {
    if (this.visibilityBound || typeof document === 'undefined') return;
    this.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.connected() && !this.intentionalClose) {
        this.failCount = Math.min(this.failCount, 3);
        this.retryMs = 2000;
        this.open();
      }
    });
  }

  private open(): void {
    if (this.intentionalClose || this.opening) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.scheduleReconnect();
      return;
    }
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.opening = true;
    this.teardownSocket();

    try {
      const path = this.paths[this.pathIndex % this.paths.length];
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${window.location.host}${path}`;
      const ws = new WebSocket(url);
      this.socket = ws;

      ws.onopen = () => {
        this.opening = false;
        this.connected.set(true);
        this.failing.set(false);
        this.failCount = 0;
        this.retryMs = 2000;
      };
      ws.onmessage = (ev) => {
        try {
          const env = JSON.parse(String(ev.data)) as RealtimeEnvelope;
          if (!env?.type) return;
          this.lastEventAt.set(new Date().toISOString());
          this.onMessage?.(env);
        } catch {
          /* ignore malformed */
        }
      };
      ws.onclose = () => {
        this.opening = false;
        this.connected.set(false);
        if (this.socket === ws) this.socket = undefined;
        this.failCount += 1;
        this.failing.set(this.failCount >= 3);
        // Rotate path after a couple failures (proxy may only expose one).
        if (this.failCount % 2 === 0) {
          this.pathIndex = (this.pathIndex + 1) % this.paths.length;
        }
        this.scheduleReconnect();
      };
      ws.onerror = () => {
        // onclose will run next; avoid double-scheduling.
        try { ws.close(); } catch { /* ignore */ }
      };
    } catch {
      this.opening = false;
      this.failCount += 1;
      this.failing.set(true);
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
    // Back off hard after repeated failures so the console isn't spammed.
    const cap = this.failCount >= 8 ? 120_000 : 45_000;
    const wait = Math.min(cap, this.retryMs);
    this.retryMs = Math.min(cap, Math.round(this.retryMs * 1.7));
    this.retryTimer = setTimeout(() => this.open(), wait);
  }
}
