import { Injectable, inject, signal } from '@angular/core';
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
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  readonly connected = signal(false);
  readonly lastEventAt = signal('');

  private socket?: WebSocket;
  private intentionalClose = false;
  private retryMs = 1500;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private onMessage?: (env: RealtimeEnvelope) => void;

  connect(handler: (env: RealtimeEnvelope) => void): void {
    this.onMessage = handler;
    this.intentionalClose = false;
    this.open();
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.socket?.close();
    this.socket = undefined;
    this.connected.set(false);
  }

  private open(): void {
    if (this.intentionalClose) return;
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${window.location.host}/ws`;
      const ws = new WebSocket(url);
      this.socket = ws;

      ws.onopen = () => {
        this.connected.set(true);
        this.retryMs = 1500;
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
        this.connected.set(false);
        this.socket = undefined;
        this.scheduleReconnect();
      };
      ws.onerror = () => {
        ws.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose) return;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const wait = this.retryMs;
    this.retryMs = Math.min(30_000, Math.round(this.retryMs * 1.6));
    this.retryTimer = setTimeout(() => this.open(), wait);
  }
}
