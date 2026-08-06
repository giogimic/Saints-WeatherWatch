import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as L from 'leaflet';
import { AuthService } from '../../core/auth.service';
import { vehicleSvg } from '../../core/vehicles';
import { QuizAward, WeatherService } from '../../core/weather.service';
import { WorldService } from '../../core/world.service';

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
/** Expanded Maine / St. John Valley corridor (matches server world.Bounds). */
const BOUNDS = { minLat: 44.6, maxLat: 47.5, minLng: -71.2, maxLng: -66.9 };
const MOVE_SPEED = 0.14;
const PICKUP_DIST = 0.055;
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

/** Shared-world materials / gear names (server catalog). */
const WORLD_NAMES: Record<string, { name: string; rarity: string }> = {
  scrap_metal: { name: 'Scrap Metal', rarity: 'common' },
  wiring: { name: 'Wiring', rarity: 'common' },
  battery: { name: 'Battery', rarity: 'common' },
  plastic_parts: { name: 'Plastic Parts', rarity: 'common' },
  fuel_can: { name: 'Fuel Can', rarity: 'uncommon' },
  camera_parts: { name: 'Camera Parts', rarity: 'uncommon' },
  gps_module: { name: 'GPS Module', rarity: 'uncommon' },
  radio_parts: { name: 'Radio Parts', rarity: 'uncommon' },
  blueprint_frag: { name: 'Blueprint Fragment', rarity: 'rare' },
  advanced_sensor: { name: 'Advanced Sensor', rarity: 'rare' },
  basic_probe: { name: 'Basic Probe', rarity: 'uncommon' },
  repair_kit: { name: 'Repair Kit', rarity: 'common' },
};

@Component({
  selector: 'app-chase-game',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      #shell
      class="chase-shell space-y-3"
      [class.chase-immersive]="immersive"
    >
      <div class="flex items-center gap-2 chase-topbar">
        <button
          type="button"
          class="btn btn-ghost btn-sm rounded-xl font-black uppercase text-[10px] min-h-11 border border-base-300 shrink-0"
          (click)="leaveGame()"
        >
          ← Exit
        </button>
        <div class="min-w-0 flex-1">
          <h2 class="font-black uppercase italic text-white text-lg leading-tight">Storm World</h2>
          @if (!immersive) {
            <p class="text-xs text-base-content/55 font-semibold hidden sm:block">
              Shared map · same drops · simulated events · craft & trade after.
            </p>
          }
        </div>
        @if (immersive) {
          <button
            type="button"
            class="btn btn-sm rounded-xl font-black uppercase text-[10px] min-h-11 border border-base-300 bg-base-300/50 shrink-0"
            (click)="exitFullscreen()"
          >
            Exit full
          </button>
        } @else if (phase !== 'ready') {
          <button
            type="button"
            class="btn btn-sm btn-primary rounded-xl font-black uppercase text-[10px] min-h-11 shrink-0"
            (click)="enterFullscreen()"
          >
            Fullscreen
          </button>
        }
      </div>

      @if (phase === 'ready') {
        <article class="storm-card p-4 space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-16 h-10 shrink-0" [innerHTML]="vehicleIcon"></div>
            <div>
              <p class="text-sm font-black text-white italic">{{ vehicleLabel }}</p>
              <p class="text-xs text-base-content/55 font-semibold">
                Open drive · full Maine corridor · live radar
                @if (auth.isLoggedIn()) {
                  · shared multiplayer world
                }
              </p>
            </div>
          </div>
          <p class="text-sm font-semibold text-base-content/70">
            Stick or <span class="text-white font-black">WASD</span>.
            Logged-in chasers share the same server drops and events (first bag wins).
            Guests still get a solo practice run.
          </p>
          <div class="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              class="btn btn-primary w-full rounded-xl font-black uppercase tracking-wider min-h-12 sm:flex-1"
              (click)="startRun(true)"
            >
              Start fullscreen
            </button>
            <button
              type="button"
              class="btn btn-ghost border border-base-300 w-full rounded-xl font-black uppercase tracking-wider min-h-12 sm:flex-1"
              (click)="startRun(false)"
            >
              Start in page
            </button>
          </div>
        </article>
      }

      @if (phase === 'running' || phase === 'done') {
        <div
          class="chase-stage relative overflow-hidden border border-base-300 bg-base-300"
          [class.rounded-2xl]="!immersive"
        >
          <div id="chase-map" class="absolute inset-0 z-0"></div>

          <div class="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-start gap-2 pointer-events-none">
            <div class="pointer-events-none storm-card px-3 py-2 text-xs font-black uppercase tracking-wider">
              <span class="text-accent">{{ bagged.length }} bagged</span>
              @if (worldMode) {
                <span class="text-base-content/40 mx-2">·</span>
                <span class="text-primary">{{ onlineLabel() }}</span>
              }
            </div>
            @if (toast) {
              <div class="storm-card px-3 py-2 text-xs font-black uppercase tracking-wider text-secondary">
                {{ toast }}
              </div>
            }
            <div class="flex-1"></div>
            @if (phase === 'running') {
              <div class="pointer-events-auto flex gap-1.5">
                @if (!immersive) {
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm rounded-xl border border-base-300/80 bg-base-300/50 backdrop-blur-sm font-black uppercase text-[10px] min-h-11"
                    (click)="enterFullscreen()"
                  >
                    Full
                  </button>
                }
                <button
                  type="button"
                  class="btn btn-ghost btn-sm rounded-xl border border-base-300/80 bg-base-300/50 backdrop-blur-sm font-black uppercase text-[10px] min-h-11"
                  (click)="endRun()"
                >
                  End
                </button>
              </div>
            }
          </div>

          @if (phase === 'running') {
            <div
              class="chase-stick absolute z-[1000] select-none touch-none"
              [class.chase-stick-lg]="immersive || isMobile()"
              (pointerdown)="onStickDown($event)"
              (pointermove)="onStickMove($event)"
              (pointerup)="onStickUp($event)"
              (pointercancel)="onStickUp($event)"
              aria-label="Drive stick"
            >
              <div class="chase-stick-base">
                <div
                  class="chase-stick-knob"
                  [style.transform]="'translate(' + stickKnobX + 'px,' + stickKnobY + 'px)'"
                ></div>
              </div>
              <p class="chase-stick-hint">{{ isMobile() ? 'Steer' : 'WASD' }}</p>
            </div>
          }

          @if (phase === 'done' && immersive) {
            <div class="absolute inset-0 z-[1100] flex items-end sm:items-center justify-center p-3 bg-black/55">
              <article class="storm-card p-4 text-center space-y-3 w-full max-w-md max-h-[85%] overflow-y-auto">
                <ng-container *ngTemplateOutlet="resultsBody"></ng-container>
              </article>
            </div>
          }
        </div>
      }

      @if (phase === 'done' && !immersive) {
        <article class="storm-card p-4 text-center space-y-3">
          <ng-container *ngTemplateOutlet="resultsBody"></ng-container>
        </article>
      }

      <ng-template #resultsBody>
        <p class="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Chase complete</p>
        <h3 class="text-2xl font-black text-white italic uppercase">
          {{ bagged.length }} drop{{ bagged.length === 1 ? '' : 's' }} bagged
        </h3>
        @if (bagged.length) {
          <ul class="text-left space-y-1.5 max-w-sm mx-auto">
            @for (item of bagged; track $index) {
              <li class="flex justify-between gap-2 text-sm">
                <span class="font-bold text-white">{{ itemName(item) }}</span>
                <span class="text-[10px] uppercase tracking-wider text-base-content/45 font-bold">{{ rarityOf(item) }}</span>
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
          <p class="text-xs font-bold text-success uppercase tracking-wider">
            {{ worldMode ? 'Saved to your packs (server)' : 'Loot saved to your profile' }}
          </p>
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
          <button type="button" class="btn btn-primary rounded-xl font-black uppercase min-h-12" (click)="startRun(immersive || isMobile())">
            Chase again
          </button>
          <button type="button" class="btn btn-ghost border border-base-300 rounded-xl font-black uppercase min-h-12" (click)="leaveGame()">
            Exit to Play
          </button>
        </div>
      </ng-template>
    </div>
  `,
})
export class ChaseGameComponent implements AfterViewInit, OnDestroy {
  @Output() exit = new EventEmitter<void>();
  @ViewChild('shell') shellRef?: ElementRef<HTMLElement>;

  readonly auth = inject(AuthService);
  private readonly weather = inject(WeatherService);
  readonly world = inject(WorldService);
  private readonly sanitizer = inject(DomSanitizer);

  phase: ChasePhase = 'ready';
  immersive = false;
  bagged: string[] = [];
  toast = '';
  lastAward: QuizAward | null = null;
  savedLoot = false;
  vehicleIcon: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(vehicleSvg('starter_car'));
  vehicleLabel = 'Starter Chase Car';
  stickKnobX = 0;
  stickKnobY = 0;
  worldMode = false;

  private map?: L.Map;
  private playerMarker?: L.Marker;
  private radarLayer?: L.TileLayer.WMS;
  private drops: DropMarker[] = [];
  private lat = CENTER[0];
  private lng = CENTER[1];
  private toastTimer?: ReturnType<typeof setTimeout>;
  private startedAt = 0;

  private keys = new Set<string>();
  private stickX = 0;
  private stickY = 0;
  private stickActive = false;
  private stickOriginX = 0;
  private stickOriginY = 0;
  private stickRadius = 36;
  private rafId = 0;
  private lastFrame = 0;

  private otherMarkers = new Map<string, L.Marker>();
  private worldDropMarkers = new Map<string, L.Marker>();
  private eventMarker?: L.Marker;
  private syncTimer?: ReturnType<typeof setInterval>;
  private pendingPickups = new Map<string, string>();
  private inflightPickups = new Set<string>();
  private inflightEvent = false;
  private lastWorldToast = '';
  private lastBagSeq = 0;

  ngAfterViewInit(): void {
    this.refreshVehicle();
  }

  ngOnDestroy(): void {
    this.stopLoop();
    this.stopWorldSync();
    this.destroyMap();
    this.keys.clear();
    this.teardownImmersive(false);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(ev: KeyboardEvent): void {
    if (this.phase !== 'running') return;
    if (ev.key === 'Escape' && this.immersive) {
      ev.preventDefault();
      this.exitFullscreen();
      return;
    }
    const k = ev.key.toLowerCase();
    if (!this.isMoveKey(k)) return;
    if (ev.repeat) return;
    ev.preventDefault();
    this.keys.add(k);
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(ev: KeyboardEvent): void {
    const k = ev.key.toLowerCase();
    if (!this.isMoveKey(k)) return;
    this.keys.delete(k);
  }

  @HostListener('document:fullscreenchange')
  onFsChange(): void {
    // If user exits browser fullscreen via system UI, keep CSS immersive unless they hit Exit full.
    if (!document.fullscreenElement && this.immersive) {
      // stay in CSS immersive — that's the reliable mobile shell
      setTimeout(() => this.map?.invalidateSize(), 80);
    }
  }

  isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches
      || window.matchMedia('(pointer: coarse)').matches;
  }

  leaveGame(): void {
    if (this.phase === 'running') this.endRun();
    this.stopWorldSync();
    this.world.disconnectWorld();
    this.teardownImmersive(true);
    this.exit.emit();
  }

  enterFullscreen(): void {
    this.immersive = true;
    this.lockBodyScroll(true);
    this.stickRadius = this.isMobile() ? 44 : 36;
    const el = this.shellRef?.nativeElement;
    const req = el?.requestFullscreen?.bind(el)
      || (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> })?.webkitRequestFullscreen?.bind(el);
    if (req) {
      try { void Promise.resolve(req()).catch(() => undefined); } catch { /* iOS may throw */ }
    }
    setTimeout(() => this.map?.invalidateSize(), 120);
  }

  exitFullscreen(): void {
    this.teardownImmersive(true);
    setTimeout(() => this.map?.invalidateSize(), 120);
  }

  startRun(preferFullscreen = false): void {
    this.refreshVehicle();
    this.phase = 'running';
    this.bagged = [];
    this.toast = '';
    this.lastAward = null;
    this.savedLoot = false;
    this.keys.clear();
    this.resetStick();
    this.lat = CENTER[0] + (Math.random() - 0.5) * 0.1;
    this.lng = CENTER[1] + (Math.random() - 0.5) * 0.1;
    this.startedAt = Date.now();
    this.stopLoop();

    if (preferFullscreen) {
      this.enterFullscreen();
    }

    this.stickRadius = (this.immersive || this.isMobile()) ? 44 : 36;
    this.worldMode = this.auth.isLoggedIn();
    this.pendingPickups.clear();
    this.inflightPickups.clear();
    this.inflightEvent = false;
    this.lastWorldToast = '';
    this.lastBagSeq = 0;
    if (this.worldMode) {
      this.world.connectWorld(this.lat, this.lng);
    }

    setTimeout(() => {
      this.ensureMap();
      if (this.worldMode) {
        this.clearDrops();
        this.world.connectWorld(this.lat, this.lng);
        this.startWorldSync();
      } else {
        this.spawnDrops();
      }
      this.placePlayer();
      this.startLoop();
      this.map?.invalidateSize();
    }, 60);
  }

  endRun(): void {
    if (this.phase !== 'running') return;
    this.stopLoop();
    this.stopWorldSync();
    this.resetStick();
    this.keys.clear();
    this.phase = 'done';
    const seconds = Math.max(1, Math.round((Date.now() - this.startedAt) / 1000));
    // Shared world already granted items server-side — never trust client bag for that path.
    if (this.worldMode) {
      this.savedLoot = this.bagged.length > 0;
      this.world.refreshInventory().subscribe();
      this.auth.refreshMe().subscribe();
      return;
    }
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
    this.auth.pendingChase = {
      items: [...this.bagged],
      seconds: Math.max(1, Math.round((Date.now() - this.startedAt) / 1000)),
    };
    this.auth.openModal('signup');
  }

  onStickDown(ev: PointerEvent): void {
    if (this.phase !== 'running') return;
    const el = ev.currentTarget as HTMLElement;
    el.setPointerCapture(ev.pointerId);
    const rect = el.getBoundingClientRect();
    this.stickOriginX = rect.left + rect.width / 2;
    this.stickOriginY = rect.top + rect.height / 2;
    this.stickActive = true;
    this.updateStickFromPointer(ev.clientX, ev.clientY);
    ev.preventDefault();
  }

  onStickMove(ev: PointerEvent): void {
    if (!this.stickActive) return;
    this.updateStickFromPointer(ev.clientX, ev.clientY);
    ev.preventDefault();
  }

  onStickUp(ev: PointerEvent): void {
    if (!this.stickActive) return;
    this.stickActive = false;
    this.resetStick();
    try {
      (ev.currentTarget as HTMLElement).releasePointerCapture(ev.pointerId);
    } catch { /* ignore */ }
  }

  itemName(key: string): string {
    return LOOT_META[key]?.name || WORLD_NAMES[key]?.name || key.replace(/_/g, ' ');
  }

  rarityOf(key: string): string {
    return LOOT_META[key]?.rarity || WORLD_NAMES[key]?.rarity || 'common';
  }

  onlineLabel(): string {
    if (!this.world.connected()) return 'connecting…';
    const n = this.world.players().length;
    if (n <= 1) return '1 online (you)';
    return `${n} online`;
  }

  private teardownImmersive(exitBrowserFs: boolean): void {
    this.immersive = false;
    this.lockBodyScroll(false);
    if (exitBrowserFs && document.fullscreenElement) {
      const exitFs = document.exitFullscreen?.bind(document)
        || (document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen?.bind(document);
      try { void Promise.resolve(exitFs?.()).catch(() => undefined); } catch { /* ignore */ }
    }
  }

  private lockBodyScroll(lock: boolean): void {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('chase-noscroll', lock);
  }

  private isMoveKey(k: string): boolean {
    return k === 'w' || k === 'a' || k === 's' || k === 'd'
      || k === 'arrowup' || k === 'arrowdown' || k === 'arrowleft' || k === 'arrowright';
  }

  private updateStickFromPointer(clientX: number, clientY: number): void {
    let dx = clientX - this.stickOriginX;
    let dy = clientY - this.stickOriginY;
    const mag = Math.hypot(dx, dy);
    const r = this.stickRadius;
    if (mag > r) {
      dx = (dx / mag) * r;
      dy = (dy / mag) * r;
    }
    this.stickKnobX = dx;
    this.stickKnobY = dy;
    this.stickX = dx / r;
    this.stickY = -dy / r;
  }

  private resetStick(): void {
    this.stickX = 0;
    this.stickY = 0;
    this.stickKnobX = 0;
    this.stickKnobY = 0;
    this.stickActive = false;
  }

  private startLoop(): void {
    this.lastFrame = performance.now();
    const tick = (now: number) => {
      if (this.phase !== 'running') return;
      const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
      this.lastFrame = now;
      this.applyMovement(dt);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopLoop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  private applyMovement(dt: number): void {
    let dx = this.stickX;
    let dy = this.stickY;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy += 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy -= 1;

    const mag = Math.hypot(dx, dy);
    if (mag < 0.08) return;
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }

    const step = MOVE_SPEED * dt;
    this.lng = this.clamp(this.lng + dx * step, BOUNDS.minLng, BOUNDS.maxLng);
    this.lat = this.clamp(this.lat + dy * step, BOUNDS.minLat, BOUNDS.maxLat);
    this.placePlayer(false);
    if (this.worldMode) {
      this.world.sendMove(this.lat, this.lng);
      this.tryWorldPickups();
      this.tryEventPlace();
    } else {
      this.checkPickups();
    }
  }

  private startWorldSync(): void {
    this.stopWorldSync();
    this.syncWorldMarkers();
    // Match server presence tick (~10 Hz) so peer markers stay live.
    this.syncTimer = setInterval(() => this.syncWorldMarkers(), 100);
  }

  private stopWorldSync(): void {
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.syncTimer = undefined;
    for (const m of this.otherMarkers.values()) m.remove();
    this.otherMarkers.clear();
    for (const m of this.worldDropMarkers.values()) m.remove();
    this.worldDropMarkers.clear();
    this.eventMarker?.remove();
    this.eventMarker = undefined;
  }

  private syncWorldMarkers(): void {
    if (!this.map || !this.worldMode) return;
    const me = this.auth.user()?.id;
    const seen = new Set<string>();
    for (const p of this.world.players()) {
      if (!p.userId || p.userId === me) continue;
      seen.add(p.userId);
      let m = this.otherMarkers.get(p.userId);
      const name = this.escape(p.chaserName || 'Chaser');
      const truck = vehicleSvg(p.vehicleKey || 'starter_car');
      const icon = L.divIcon({
        className: 'chase-peer-icon',
        html: `<div class="chase-peer"><div class="chase-peer-truck">${truck}</div><div class="chase-peer-name">${name}</div></div>`,
        iconSize: [72, 52],
        iconAnchor: [36, 40],
      });
      if (!m) {
        m = L.marker([p.lat, p.lng], { icon, interactive: false, zIndexOffset: 500 }).addTo(this.map);
        this.otherMarkers.set(p.userId, m);
      } else {
        m.setLatLng([p.lat, p.lng]);
        m.setIcon(icon);
      }
    }
    for (const [id, m] of this.otherMarkers) {
      if (!seen.has(id)) {
        m.remove();
        this.otherMarkers.delete(id);
      }
    }

    const dropSeen = new Set<string>();
    for (const d of this.world.drops()) {
      dropSeen.add(d.id);
      const color = d.rarity === 'rare' ? '#fbbf24' : d.rarity === 'uncommon' ? '#38bdf8' : '#86efac';
      let m = this.worldDropMarkers.get(d.id);
      const icon = L.divIcon({
        className: 'chase-drop-icon',
        html: `<div style="width:16px;height:16px;border-radius:999px;background:${color};border:2px solid #0b1120;box-shadow:0 0 8px ${color};"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      if (!m) {
        m = L.marker([d.lat, d.lng], { icon, interactive: false }).addTo(this.map);
        this.worldDropMarkers.set(d.id, m);
      } else {
        m.setLatLng([d.lat, d.lng]);
      }
    }
    for (const [id, m] of this.worldDropMarkers) {
      if (!dropSeen.has(id)) {
        m.remove();
        this.worldDropMarkers.delete(id);
      }
    }

    const ev = this.world.event();
    if (ev?.active) {
      const icon = L.divIcon({
        className: 'chase-drop-icon',
        html: `<div style="padding:4px 8px;border-radius:10px;background:#7c3aed;color:#fff;font:900 10px/1.2 sans-serif;border:2px solid #fde68a;">SIM</div>`,
        iconSize: [48, 22],
        iconAnchor: [24, 11],
      });
      if (!this.eventMarker) {
        this.eventMarker = L.marker([ev.lat, ev.lng], { icon, interactive: false }).addTo(this.map);
      } else {
        this.eventMarker.setLatLng([ev.lat, ev.lng]);
        this.eventMarker.setIcon(icon);
      }
    } else {
      this.eventMarker?.remove();
      this.eventMarker = undefined;
    }

    const t = this.world.toast();
    if (t && t !== this.lastWorldToast) {
      this.lastWorldToast = t;
      this.showToast(t);
    } else if (!t) {
      this.lastWorldToast = '';
    }

    const bag = this.world.lastBag();
    if (bag && bag.seq !== this.lastBagSeq) {
      this.lastBagSeq = bag.seq;
      if (bag.dropId) {
        this.inflightPickups.delete(bag.dropId);
        this.pendingPickups.delete(bag.dropId);
      }
      if (bag.itemKey && this.bagged.length < 24) {
        this.bagged = [...this.bagged, bag.itemKey];
      }
    }
  }

  private tryWorldPickups(): void {
    for (const d of this.world.drops()) {
      if (this.inflightPickups.has(d.id)) continue;
      if (Math.hypot(d.lat - this.lat, d.lng - this.lng) > PICKUP_DIST) continue;
      this.inflightPickups.add(d.id);
      this.pendingPickups.set(d.id, d.itemKey);
      this.world.sendPickup(d.id, this.lat, this.lng);
      // Safety: allow retry if server never answers (e.g. too-far then drive closer).
      setTimeout(() => {
        if (this.inflightPickups.has(d.id) && this.world.drops().some(x => x.id === d.id)) {
          this.inflightPickups.delete(d.id);
        }
      }, 2000);
    }
  }

  private tryEventPlace(): void {
    const ev = this.world.event();
    if (!ev?.active || this.inflightEvent) return;
    if (Math.hypot(ev.lat - this.lat, ev.lng - this.lng) <= PICKUP_DIST * 1.4) {
      this.inflightEvent = true;
      this.world.sendEventPlace(ev.id, this.lat, this.lng);
      setTimeout(() => { this.inflightEvent = false; }, 2500);
    }
  }

  private escape(s: string): string {
    return (s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c));
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
    // Disable map drag during chase so the stick owns touch gestures.
    this.map = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: true,
      boxZoom: false,
      keyboard: false,
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
    setTimeout(() => this.map?.invalidateSize(), 80);
  }

  private destroyMap(): void {
    this.clearDrops();
    for (const m of this.otherMarkers.values()) m.remove();
    this.otherMarkers.clear();
    for (const m of this.worldDropMarkers.values()) m.remove();
    this.worldDropMarkers.clear();
    this.eventMarker?.remove();
    this.eventMarker = undefined;
    this.playerMarker?.remove();
    this.playerMarker = undefined;
    this.map?.remove();
    this.map = undefined;
  }

  private placePlayer(pan = true): void {
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
    if (pan) {
      this.map.panTo([this.lat, this.lng], { animate: true, duration: 0.15 });
    } else {
      const center = this.map.getCenter();
      if (Math.hypot(center.lat - this.lat, center.lng - this.lng) > 0.12) {
        this.map.panTo([this.lat, this.lng], { animate: true, duration: 0.25 });
      }
    }
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

  private showToast(msg: string): void {
    this.toast = msg;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast = ''), 1400);
  }

  private clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }
}
