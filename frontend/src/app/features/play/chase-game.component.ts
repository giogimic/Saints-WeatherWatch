import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  EventEmitter,
  OnDestroy,
  Output,
  inject,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as L from 'leaflet';
import { AuthService } from '../../core/auth.service';
import { vehicleSvg } from '../../core/vehicles';
import { QuizAward, WeatherService } from '../../core/weather.service';

type ChasePhase = 'ready' | 'running' | 'done';

interface DropMarker {
  key: string;
  name: string;
  rarity: string;
  marker: L.Marker;
  lat: number;
  lng: number;
}

const CENTER: [number, number] = [47.05, -68.35];
const BOUNDS = { minLat: 46.55, maxLat: 47.55, minLng: -69.15, maxLng: -67.55 };
const RUN_SECONDS = 60;
const STEP = 0.028;
const PICKUP_DIST = 0.035;
const DROP_COUNT = 7;

const LOOT_META: Record<string, { name: string; rarity: string; weight: number }> = {
  radar_core: { name: 'Radar Core Ping', rarity: 'common', weight: 5 },
  hail_stone: { name: 'Hail Sample', rarity: 'common', weight: 5 },
  wind_flag: { name: 'Wind Flag', rarity: 'common', weight: 5 },
  storm_photo: { name: 'Storm Photo', rarity: 'uncommon', weight: 3 },
  funnel_sketch: { name: 'Funnel Sketch', rarity: 'uncommon', weight: 3 },
  lightning_chip: { name: 'Lightning Chip', rarity: 'uncommon', weight: 3 },
  mesocyclone_coin: { name: 'Mesocyclone Coin', rarity: 'rare', weight: 1 },
  chase_medal: { name: 'Chase Medal', rarity: 'rare', weight: 1 },
};

@Component({
  selector: 'app-chase-game',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="btn btn-ghost btn-sm rounded-xl font-black uppercase text-[10px] min-h-11 border border-base-300"
          (click)="exit.emit()"
        >
          ← Exit
        </button>
        <div class="min-w-0">
          <h2 class="font-black uppercase italic text-white text-lg leading-tight">Radar Chase</h2>
          <p class="text-xs text-base-content/55 font-semibold">
            Drive your truck. Grab glowing drops. Save loot to your profile.
          </p>
        </div>
      </div>

      @if (phase === 'ready') {
        <article class="storm-card p-4 space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-16 h-10 shrink-0" [innerHTML]="vehicleIcon"></div>
            <div>
              <p class="text-sm font-black text-white italic">{{ vehicleLabel }}</p>
              <p class="text-xs text-base-content/55 font-semibold">
                {{ RUN_SECONDS }}s · northern Maine radar · random field drops
              </p>
            </div>
          </div>
          <p class="text-sm font-semibold text-base-content/70">
            Use the big arrows to roll. When you get close to a drop, you auto-bag it.
            @if (!auth.isLoggedIn()) {
              Log in after a run to keep loot on your profile.
            }
          </p>
          <button
            type="button"
            class="btn btn-primary w-full rounded-xl font-black uppercase tracking-wider min-h-12"
            (click)="startRun()"
          >
            Start chase
          </button>
        </article>
      }

      @if (phase === 'running' || phase === 'done') {
        <div class="relative rounded-2xl overflow-hidden border border-base-300 min-h-[48vh] md:min-h-[420px]">
          <div #mapHost id="chase-map" class="absolute inset-0 z-0"></div>

          <div class="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap gap-2 pointer-events-none">
            <div class="pointer-events-none storm-card px-3 py-2 text-xs font-black uppercase tracking-wider">
              <span class="text-primary">{{ timeLeft }}s</span>
              <span class="text-base-content/40 mx-2">·</span>
              <span class="text-accent">{{ bagged.length }} bagged</span>
            </div>
            @if (toast) {
              <div class="storm-card px-3 py-2 text-xs font-black uppercase tracking-wider text-secondary">
                {{ toast }}
              </div>
            }
          </div>

          @if (phase === 'running') {
            <div class="absolute bottom-3 left-0 right-0 z-[1000] flex justify-center pointer-events-none">
              <div class="pointer-events-auto grid grid-cols-3 gap-1.5 w-44">
                <div></div>
                <button type="button" class="btn btn-primary btn-sm min-h-12 rounded-xl font-black text-lg" (click)="nudge(0, 1)">▲</button>
                <div></div>
                <button type="button" class="btn btn-primary btn-sm min-h-12 rounded-xl font-black text-lg" (click)="nudge(-1, 0)">◀</button>
                <button type="button" class="btn btn-ghost btn-sm min-h-12 rounded-xl border border-base-300 font-black text-[10px] uppercase" (click)="endRun()">End</button>
                <button type="button" class="btn btn-primary btn-sm min-h-12 rounded-xl font-black text-lg" (click)="nudge(1, 0)">▶</button>
                <div></div>
                <button type="button" class="btn btn-primary btn-sm min-h-12 rounded-xl font-black text-lg" (click)="nudge(0, -1)">▼</button>
                <div></div>
              </div>
            </div>
          }
        </div>
      }

      @if (phase === 'done') {
        <article class="storm-card p-4 text-center space-y-3">
          <p class="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Chase complete</p>
          <h3 class="text-2xl font-black text-white italic uppercase">
            {{ bagged.length }} drop{{ bagged.length === 1 ? '' : 's' }} bagged
          </h3>
          @if (bagged.length) {
            <ul class="text-left space-y-1.5 max-w-sm mx-auto">
              @for (item of bagged; track $index) {
                <li class="flex justify-between gap-2 text-sm">
                  <span class="font-bold text-white">{{ itemName(item) }}</span>
                  <span class="text-[10px] font-black uppercase tracking-wider text-base-content/45">{{ rarityOf(item) }}</span>
                </li>
              }
            </ul>
          } @else {
            <p class="text-sm font-semibold text-base-content/55">No drops this time — roll again and get closer.</p>
          }
          @if (lastAward) {
            <p class="text-sm font-black text-accent uppercase tracking-wider">
              +{{ lastAward.xpGained }} XP
              @if (lastAward.levelUp) {
                <span class="text-primary"> · Level {{ lastAward.level }}!</span>
              }
            </p>
          }
          @if (savedLoot) {
            <p class="text-xs font-bold text-success uppercase tracking-wider">Loot saved to your profile</p>
          } @else if (!auth.isLoggedIn() && bagged.length) {
            <button
              type="button"
              class="btn btn-primary btn-sm rounded-xl font-black uppercase min-h-11"
              (click)="promptSave()"
            >
              Log in to keep loot
            </button>
          }
          <div class="flex flex-col sm:flex-row gap-2 justify-center pt-1">
            <button type="button" class="btn btn-primary rounded-xl font-black uppercase min-h-12" (click)="startRun()">
              Chase again
            </button>
            <button type="button" class="btn btn-ghost border border-base-300 rounded-xl font-black uppercase min-h-12" (click)="exit.emit()">
              Back to Play
            </button>
          </div>
        </article>
      }
    </div>
  `,
})
export class ChaseGameComponent implements AfterViewInit, OnDestroy {
  @Output() exit = new EventEmitter<void>();

  readonly auth = inject(AuthService);
  private readonly weather = inject(WeatherService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly RUN_SECONDS = RUN_SECONDS;

  phase: ChasePhase = 'ready';
  timeLeft = RUN_SECONDS;
  bagged: string[] = [];
  toast = '';
  lastAward: QuizAward | null = null;
  savedLoot = false;
  vehicleIcon: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(vehicleSvg('starter_car'));
  vehicleLabel = 'Starter Chase Car';

  private map?: L.Map;
  private playerMarker?: L.Marker;
  private radarLayer?: L.TileLayer.WMS;
  private drops: DropMarker[] = [];
  private lat = CENTER[0];
  private lng = CENTER[1];
  private timer?: ReturnType<typeof setInterval>;
  private toastTimer?: ReturnType<typeof setTimeout>;
  private startedAt = 0;
  private mapReady = false;

  ngAfterViewInit(): void {
    this.refreshVehicle();
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.destroyMap();
  }

  startRun(): void {
    this.refreshVehicle();
    this.phase = 'running';
    this.timeLeft = RUN_SECONDS;
    this.bagged = [];
    this.toast = '';
    this.lastAward = null;
    this.savedLoot = false;
    this.lat = CENTER[0] + (Math.random() - 0.5) * 0.1;
    this.lng = CENTER[1] + (Math.random() - 0.5) * 0.1;
    this.startedAt = Date.now();
    this.clearTimer();

    setTimeout(() => {
      this.ensureMap();
      this.spawnDrops();
      this.placePlayer();
      this.timer = setInterval(() => {
        this.timeLeft -= 1;
        if (this.timeLeft <= 0) this.endRun();
      }, 1000);
    }, 40);
  }

  nudge(dx: number, dy: number): void {
    if (this.phase !== 'running') return;
    this.lng = this.clamp(this.lng + dx * STEP, BOUNDS.minLng, BOUNDS.maxLng);
    this.lat = this.clamp(this.lat + dy * STEP, BOUNDS.minLat, BOUNDS.maxLat);
    this.placePlayer();
    this.checkPickups();
  }

  endRun(): void {
    if (this.phase !== 'running') return;
    this.clearTimer();
    this.phase = 'done';
    const seconds = Math.max(1, Math.round((Date.now() - this.startedAt) / 1000));
    if (this.auth.isLoggedIn() && this.bagged.length) {
      this.weather.saveChaseRun({ items: [...this.bagged], seconds }).subscribe(res => {
        if (!res) return;
        this.savedLoot = true;
        this.lastAward = res.award ?? null;
        this.auth.refreshMe().subscribe();
      });
    }
  }

  promptSave(): void {
    this.auth.pendingChase = { items: [...this.bagged], seconds: Math.max(1, RUN_SECONDS - this.timeLeft) };
    this.auth.openModal('signup');
  }

  itemName(key: string): string {
    return LOOT_META[key]?.name || key;
  }

  rarityOf(key: string): string {
    return LOOT_META[key]?.rarity || 'common';
  }

  private refreshVehicle(): void {
    const key = this.auth.user()?.equippedVehicleKey || 'starter_car';
    this.vehicleIcon = this.sanitizer.bypassSecurityTrustHtml(vehicleSvg(key));
    this.vehicleLabel = key.replace(/_/g, ' ');
  }

  private ensureMap(): void {
    const el = document.getElementById('chase-map');
    if (!el) return;
    if (this.map) {
      this.map.invalidateSize();
      return;
    }
    this.map = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
      doubleClickZoom: false,
    }).setView(CENTER, 8);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 12,
    }).addTo(this.map);

    this.radarLayer = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi', {
      layers: 'nexrad-n0r-900913',
      format: 'image/png',
      transparent: true,
      opacity: 0.75,
    } as L.WMSOptions);
    this.radarLayer.addTo(this.map);
    this.mapReady = true;
    setTimeout(() => this.map?.invalidateSize(), 80);
  }

  private destroyMap(): void {
    this.clearDrops();
    this.playerMarker?.remove();
    this.playerMarker = undefined;
    this.map?.remove();
    this.map = undefined;
    this.mapReady = false;
  }

  private placePlayer(): void {
    if (!this.map) return;
    const html = `<div class="chase-truck">${vehicleSvg(this.auth.user()?.equippedVehicleKey || 'starter_car')}</div>`;
    const icon = L.divIcon({
      className: 'chase-truck-icon',
      html,
      iconSize: [72, 40],
      iconAnchor: [36, 28],
    });
    if (!this.playerMarker) {
      this.playerMarker = L.marker([this.lat, this.lng], { icon, zIndexOffset: 600 }).addTo(this.map);
    } else {
      this.playerMarker.setLatLng([this.lat, this.lng]);
      this.playerMarker.setIcon(icon);
    }
    this.map.panTo([this.lat, this.lng], { animate: true, duration: 0.2 });
  }

  private spawnDrops(): void {
    if (!this.map) return;
    this.clearDrops();
    for (let i = 0; i < DROP_COUNT; i++) {
      const key = this.rollLoot();
      const meta = LOOT_META[key];
      const lat = BOUNDS.minLat + Math.random() * (BOUNDS.maxLat - BOUNDS.minLat);
      const lng = BOUNDS.minLng + Math.random() * (BOUNDS.maxLng - BOUNDS.minLng);
      const color = meta.rarity === 'rare' ? '#fbbf24' : meta.rarity === 'uncommon' ? '#38bdf8' : '#86efac';
      const icon = L.divIcon({
        className: 'chase-drop-icon',
        html: `<div style="width:18px;height:18px;border-radius:999px;background:${color};border:2px solid #0b1120;box-shadow:0 0 10px ${color};"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      const marker = L.marker([lat, lng], { icon, interactive: false }).addTo(this.map);
      this.drops.push({ key, name: meta.name, rarity: meta.rarity, marker, lat, lng });
    }
  }

  private checkPickups(): void {
    const keep: DropMarker[] = [];
    for (const d of this.drops) {
      const dist = Math.hypot(d.lat - this.lat, d.lng - this.lng);
      if (dist <= PICKUP_DIST && this.bagged.length < 8) {
        this.bagged = [...this.bagged, d.key];
        d.marker.remove();
        this.showToast(`Bagged ${d.name}`);
      } else {
        keep.push(d);
      }
    }
    this.drops = keep;
  }

  private rollLoot(): string {
    const pool: string[] = [];
    for (const [key, meta] of Object.entries(LOOT_META)) {
      for (let i = 0; i < meta.weight; i++) pool.push(key);
    }
    return pool[Math.floor(Math.random() * pool.length)] || 'radar_core';
  }

  private clearDrops(): void {
    for (const d of this.drops) d.marker.remove();
    this.drops = [];
  }

  private clearTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private showToast(msg: string): void {
    this.toast = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast = ''), 1400);
  }

  private clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }
}
