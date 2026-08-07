import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';

import { OpsStateService } from '../../core/ops-state.service';
import {
  CameraFeedDto,
  RadarProductDef,
  RadarScan,
  RadarStatus,
  SavedLocation,
  WeatherAlert,
  WeatherService,
} from '../../core/weather.service';

type BaseKey = 'street' | 'dark' | 'imagery';
type LayerChip = 'radar' | 'warnings' | 'lsr' | 'spc' | 'cams' | 'outages' | 'flood' | 'quakes';
type RadarProductId = 'n0r' | 'n0q' | 'n0s';

interface MapPersist {
  lat: number;
  lng: number;
  zoom: number;
  base: BaseKey;
  layers: LayerChip[];
}

const DEFAULT_CENTER: [number, number] = [47.05, -68.35];
const DEFAULT_ZOOM = 8;
const STORAGE_KEY = 'ww-map-view';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-[calc(100vh-4rem)] flex flex-col md:p-4 md:gap-4">
      <!-- Desktop header -->
      <div class="hidden md:block max-w-7xl mx-auto w-full px-2">
        <h1 class="text-3xl font-black text-white italic uppercase tracking-wider font-sans">Storm Map</h1>
        <p class="text-base-content/55 text-sm font-semibold mt-0.5">
          Northern Maine / St. John Valley · radar, flood, quakes, outages, cams
        </p>
        <p class="text-[10px] text-base-content/45 font-semibold mt-1 max-w-3xl leading-relaxed"
          [title]="ops.policyNote() || 'Official/licensed feeds only'">
          {{ ops.attribution() }}
        </p>
      </div>

      <div class="flex-1 flex flex-col md:flex-row gap-0 md:gap-4 max-w-7xl mx-auto w-full md:px-2 min-h-0">
        <!-- Map canvas -->
        <section class="relative flex-1 min-h-[55vh] md:min-h-[640px] md:rounded-2xl overflow-hidden border-0 md:border md:border-base-300">
          <div id="maine-map" class="absolute inset-0 z-0"></div>

          <!-- Discrete search (collapsed by default) -->
          <div class="absolute top-3 left-3 z-[1000] max-w-[min(16rem,70vw)]">
            @if (!searchOpen) {
              <button
                type="button"
                class="btn btn-ghost btn-sm min-h-9 h-9 w-9 p-0 rounded-xl border border-base-content/15 bg-base-300/55 backdrop-blur-sm text-base-content/70 hover:bg-base-300/80"
                (click)="openSearch()"
                aria-label="Search town"
                title="Search town"
              >
                <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <circle cx="10.5" cy="10.5" r="6.5"/>
                  <path d="M16 16l4.5 4.5" stroke-linecap="round"/>
                </svg>
              </button>
            } @else {
              <div class="flex gap-1 items-center rounded-xl border border-base-content/15 bg-base-300/70 backdrop-blur-md px-1.5 py-1 shadow-sm">
                <input
                  #searchInput
                  type="text"
                  placeholder="Town…"
                  class="input input-xs input-ghost w-full min-w-0 font-semibold focus:outline-none bg-transparent h-8 px-2"
                  [(ngModel)]="searchQuery"
                  (keyup.enter)="performSearch()"
                  (keyup.escape)="closeSearch()"
                >
                <button
                  type="button"
                  class="btn btn-ghost btn-xs min-h-8 h-8 px-2 rounded-lg font-black uppercase text-[10px] shrink-0"
                  (click)="performSearch()"
                  [disabled]="isSearching"
                >
                  @if (isSearching) {
                    <span class="loading loading-spinner loading-xs"></span>
                  } @else {
                    Go
                  }
                </button>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs min-h-8 h-8 w-8 p-0 rounded-lg shrink-0 opacity-60"
                  (click)="closeSearch()"
                  aria-label="Close search"
                >✕</button>
              </div>
            }
            @if (searchError) {
              <p class="mt-1 text-error text-[10px] font-bold px-1">{{ searchError }}</p>
            }
          </div>

          <!-- Left edge: layer toggles (desktop) — no bottom bar -->
          <div class="hidden md:flex absolute top-1/2 -translate-y-1/2 left-2 z-[1000] flex-col gap-1.5 pointer-events-none max-h-[70%] overflow-y-auto pr-0.5">
            <button
              type="button"
              class="pointer-events-auto btn btn-sm rounded-xl font-black uppercase tracking-wider min-h-10 h-10 w-[3.5rem] px-0 text-[9px] border-b-[3px] backdrop-blur-md shadow-lg transition-all active:scale-95 active:border-b hover:-translate-y-0.5"
              [ngClass]="ops.impactMode() ? 'bg-warning text-warning-content border-orange-600 shadow-[0_0_12px_rgba(251,191,36,0.4)]' : 'bg-base-300/70 border-base-content/10 text-base-content/70 hover:bg-base-300/90'"
              (click)="toggleImpactMode()"
              title="Focus warnings, outages, flood, cams"
            >Imp</button>
            @for (chip of layerChips; track chip.key) {
              <button
                type="button"
                class="pointer-events-auto btn btn-sm rounded-xl font-black uppercase tracking-wider min-h-10 h-10 w-[3.5rem] px-0 text-[9px] border-b-[3px] backdrop-blur-md shadow-lg transition-all active:scale-95 active:border-b hover:-translate-y-0.5"
                [ngClass]="layers[chip.key] ? 'bg-primary text-primary-content border-blue-800 shadow-[0_0_12px_rgba(56,189,248,0.4)]' : 'bg-base-300/70 border-base-content/10 text-base-content/70 hover:bg-base-300/90'"
                (click)="toggleLayer(chip.key)"
                [title]="chip.label"
              >{{ chip.short || chip.label }}</button>
            }
          </div>

          <!-- Top-right edge: base map -->
          <div class="hidden md:flex absolute top-3 right-3 z-[1000] flex-col gap-1.5 pointer-events-none">
            @for (b of baseChips; track b.key) {
              <button
                type="button"
                class="pointer-events-auto btn btn-sm rounded-xl font-black uppercase tracking-wider min-h-10 h-10 px-3 text-[9px] border-b-[3px] backdrop-blur-md shadow-lg transition-all active:scale-95 active:border-b hover:-translate-y-0.5"
                [ngClass]="activeBase === b.key ? 'bg-secondary text-secondary-content border-purple-800 shadow-[0_0_12px_rgba(192,132,252,0.4)]' : 'bg-base-300/70 border-base-content/10 text-base-content/70 hover:bg-base-300/90'"
                (click)="setBase(b.key)"
                [title]="b.label"
              >{{ b.short || b.label }}</button>
            }
          </div>

          <!-- Bottom Radar Timeline & Control Bar (when radar layer on) -->
          <div
            class="absolute bottom-16 md:bottom-4 left-2 right-2 md:left-1/2 md:-translate-x-1/2 md:w-auto z-[1000] flex flex-col items-center gap-1 transition-all duration-300 ease-out transform"
            [class.translate-y-8]="!layers.radar"
            [class.opacity-0]="!layers.radar"
            [class.pointer-events-none]="!layers.radar"
            [class.translate-y-0]="layers.radar"
            [class.opacity-100]="layers.radar"
          >
            <div class="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-b-[4px] border-base-content/15 bg-base-300/90 backdrop-blur-md p-2 shadow-2xl max-w-full">
              
              <!-- Play / Pause Button -->
              <button
                type="button"
                class="btn btn-sm rounded-xl font-black uppercase min-h-10 h-10 px-3.5 text-xs border-b-[3px] transition-all active:scale-95 active:border-b hover:-translate-y-0.5"
                [ngClass]="radarLooping ? 'bg-accent text-accent-content border-emerald-800 shadow-[0_0_12px_rgba(52,211,153,0.4)]' : 'bg-base-100 border-base-content/20 text-white hover:bg-base-200'"
                (click)="toggleRadarLoop()"
                [disabled]="!canLoop"
                title="Play / Pause Radar Loop"
              >
                {{ radarLooping ? '⏸ PAUSE' : '▶ PLAY' }}
              </button>

              <!-- Product Choices (Ref, HD, Vel) -->
              <div class="flex items-center gap-1 bg-base-200/60 p-1 rounded-xl border border-base-content/10">
                @for (p of radarProductChoices; track p.id) {
                  <button
                    type="button"
                    class="btn btn-sm rounded-lg font-black uppercase text-[10px] min-h-8 h-8 px-2.5 border-b-[2px] transition-all active:scale-95"
                    [ngClass]="radarProduct === p.id ? 'bg-primary text-primary-content border-blue-800 shadow-md' : 'btn-ghost text-base-content/70 hover:bg-base-300/60'"
                    (click)="setRadarProduct(p.id)"
                    [title]="p.label"
                  >{{ p.short }}</button>
                }
              </div>

              <!-- Time Scrubber Bar -->
              <div class="flex items-center gap-2 bg-base-200/60 px-3 py-1 rounded-xl border border-base-content/10 flex-1 min-w-[160px] max-w-xs h-10">
                <span class="text-[9px] font-black uppercase tracking-wider text-base-content/50 shrink-0">Time</span>
                <input
                  type="range"
                  class="range range-xs range-primary flex-1 h-2 cursor-pointer"
                  min="0"
                  [max]="Math.max(radarFrames.length - 1, 0)"
                  [(ngModel)]="radarFrameIndex"
                  (ngModelChange)="onRadarFrameScrub()"
                  [disabled]="radarFrames.length < 2"
                  [title]="radarFrameLabel"
                >
                <span class="text-[10px] font-black tabular-nums text-primary w-12 text-right truncate">{{ radarFrameLabel }}</span>
              </div>

              <!-- Station & Age Badge -->
              <div class="hidden sm:flex flex-col text-right px-1 w-24 shrink-0">
                <span class="text-[9px] font-black uppercase tracking-widest text-sky-300 truncate" [title]="radarSiteLabel">{{ radarSiteLabel }}</span>
                <span class="text-[8px] font-bold text-base-content/50 tabular-nums truncate">{{ radarAgeLabel }}</span>
              </div>

            </div>

            @if (outagePairNote) {
              <p class="pointer-events-none text-[9px] text-amber-200/90 font-bold leading-snug bg-base-300/85 backdrop-blur-md px-2.5 py-1 rounded-xl border border-amber-500/20 max-w-xs text-center shadow-md truncate">{{ outagePairNote }}</p>
            }
          </div>

          <!-- Mobile sheet handle -->
          <button
            type="button"
            class="md:hidden absolute bottom-0 left-0 right-0 z-[1000] storm-card rounded-b-none rounded-t-2xl px-4 py-3 flex items-center justify-between min-h-14 border-b-0"
            (click)="sheetOpen = !sheetOpen"
          >
            <span class="font-black uppercase tracking-widest text-xs text-primary">
              {{ sheetOpen ? 'Close panel' : 'Layers & nearby' }}
            </span>
            <span class="text-base-content/40 transition-transform" [class.rotate-180]="sheetOpen">▲</span>
          </button>
        </section>

        <!-- Desktop right rail -->
        <aside class="hidden md:flex flex-col w-80 shrink-0 gap-3">
          <ng-container *ngTemplateOutlet="sidePanel"></ng-container>
        </aside>
      </div>

      <!-- Mobile bottom sheet -->
      @if (sheetOpen) {
        <div
          class="md:hidden fixed inset-0 z-[1100] bg-black/40"
          (click)="closeSheet()"
        ></div>
        <div class="md:hidden fixed bottom-16 left-0 right-0 z-[1101] max-h-[55vh] overflow-y-auto storm-card rounded-b-none rounded-t-2xl p-4 space-y-4 border-b-0">
          <div class="flex items-center justify-between">
            <h2 class="font-black uppercase tracking-widest text-xs text-primary">Layers</h2>
            <button type="button" class="btn btn-ghost btn-xs" (click)="closeSheet()">✕</button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            @for (chip of layerChips; track chip.key) {
              <button
                type="button"
                class="btn btn-sm rounded-xl font-black uppercase tracking-wider min-h-11"
                [ngClass]="layers[chip.key] ? 'btn-primary' : 'btn-ghost border border-base-300'"
                (click)="toggleLayer(chip.key)"
              >
                {{ chip.label }}
              </button>
            }
          </div>
          <div class="flex flex-wrap gap-1.5">
            @for (b of baseChips; track b.key) {
              <button
                type="button"
                class="btn btn-sm rounded-xl font-bold uppercase min-h-11"
                [ngClass]="activeBase === b.key ? 'btn-secondary' : 'btn-ghost border border-base-300'"
                (click)="setBase(b.key)"
              >
                {{ b.label }}
              </button>
            }
          </div>
          <ng-container *ngTemplateOutlet="sidePanel"></ng-container>
        </div>
      }

      <ng-template #sidePanel>
        <article class="storm-card p-3 space-y-2">
          <h2 class="text-xs font-black uppercase tracking-widest text-sky-300">Radar systems</h2>
          <p class="text-[10px] text-base-content/45 font-semibold">
            Multi-product IEM radar · nearest NEXRAD age · loop pairs with outage delta.
          </p>
          <div class="flex flex-wrap gap-1.5">
            @for (p of radarProductChoices; track p.id) {
              <button
                type="button"
                class="btn btn-xs rounded-lg font-black uppercase tracking-wider min-h-9"
                [ngClass]="radarProduct === p.id ? 'btn-primary' : 'btn-ghost border border-base-300'"
                (click)="setRadarProduct(p.id)"
              >{{ p.label }}</button>
            }
          </div>
          <div class="rounded-lg border border-base-300/60 bg-base-200/40 px-2 py-1.5 text-[11px] font-semibold space-y-0.5">
            <div><span class="text-base-content/45">Site</span> · {{ radarSiteLabel }}</div>
            <div><span class="text-base-content/45">Scan age</span> · {{ radarAgeLabel }}</div>
            <div class="text-base-content/55 text-[10px]">{{ radarSourceNote }}</div>
          </div>
          @if (outagePairNote) {
            <p class="text-[10px] text-amber-200/80 font-semibold">{{ outagePairNote }}</p>
          }
        </article>

        <article class="storm-card p-3 space-y-2">
          <h2 class="text-xs font-black uppercase tracking-widest text-primary">Home base</h2>
          <p class="text-[10px] text-base-content/45 font-semibold">
            Pin chase spots from the current map center.
          </p>
          <div class="flex gap-2">
            <input
              type="text"
              maxlength="48"
              [(ngModel)]="newPinLabel"
              placeholder="Label (e.g. Home)"
              class="input input-xs input-bordered bg-base-200/80 border-base-300 rounded-lg font-semibold flex-1 min-h-10"
            >
            <button
              type="button"
              class="btn btn-primary btn-xs rounded-lg font-black uppercase min-h-10"
              (click)="savePinAtCenter()"
              [disabled]="savingPin"
            >
              {{ savingPin ? '…' : 'Pin' }}
            </button>
          </div>
          @if (savedLocations.length === 0) {
            <p class="text-xs text-base-content/50 font-semibold">No pins yet.</p>
          } @else {
            <div class="space-y-1.5 max-h-36 overflow-y-auto">
              @for (loc of savedLocations; track loc.id) {
                <div class="flex items-center gap-2 rounded-lg border border-base-300/60 bg-base-200/40 px-2 py-1.5">
                  <button
                    type="button"
                    class="flex-1 text-left min-w-0 min-h-10"
                    (click)="focusSavedLocation(loc)"
                  >
                    <div class="text-xs font-black text-white truncate">{{ loc.label }}</div>
                    <div class="text-[10px] text-base-content/45 font-semibold tabular-nums">
                      {{ loc.lat | number:'1.2-2' }}, {{ loc.lon | number:'1.2-2' }}
                    </div>
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs text-error/70"
                    title="Delete pin"
                    (click)="removeSavedLocation(loc.id)"
                  >✕</button>
                </div>
              }
            </div>
          }
        </article>

        <article class="storm-card p-3 space-y-2">
          <h2 class="text-xs font-black uppercase tracking-widest text-accent">Active near you</h2>
          @if (nearbyAlerts.length === 0) {
            <p class="text-xs text-base-content/50 font-semibold">No active Maine alerts right now.</p>
          } @else {
            <div class="space-y-1.5 max-h-48 overflow-y-auto">
              @for (alert of nearbyAlerts; track alert.id) {
                <button
                  type="button"
                  class="w-full text-left rounded-lg border border-base-300/60 bg-base-200/40 px-3 py-2 hover:border-primary transition-colors min-h-11"
                  (click)="focusAlert(alert)"
                >
                  <div class="text-xs font-black text-white truncate">{{ alert.headline }}</div>
                  <div class="text-[10px] text-base-content/45 font-semibold truncate">{{ alert.area }}</div>
                </button>
              }
            </div>
          }
        </article>

        <article class="storm-card p-3 space-y-2">
          <h2 class="text-xs font-black uppercase tracking-widest text-secondary">Live cams</h2>
          @if (camsWithCoords.length === 0) {
            <p class="text-xs text-base-content/50 font-semibold">No geo-tagged cams loaded.</p>
          } @else {
            <div class="space-y-1.5 max-h-56 overflow-y-auto">
              @for (cam of camsWithCoords.slice(0, 12); track cam.id) {
                <div class="flex items-center gap-2 rounded-lg border border-base-300/60 bg-base-200/40 px-2 py-1.5">
                  <button
                    type="button"
                    class="flex-1 text-left min-w-0 min-h-10"
                    (click)="focusCam(cam.id)"
                  >
                    <div class="text-xs font-black text-white truncate">{{ cam.title }}</div>
                    <div class="text-[10px] text-base-content/45 font-semibold truncate">{{ cam.region }}</div>
                  </button>
                  <a
                    class="btn btn-ghost btn-xs font-black uppercase text-[9px] shrink-0"
                    [routerLink]="['/live']"
                    [queryParams]="{ cam: cam.id }"
                  >Live</a>
                </div>
              }
            </div>
          }
        </article>

        @if (selectedLabel) {
          <article class="storm-card p-3">
            <div class="flex justify-between items-start gap-2">
              <div>
                <div class="text-[10px] uppercase tracking-widest text-base-content/40 font-bold">Selected</div>
                <div class="text-sm font-black text-white">{{ selectedLabel }}</div>
              </div>
              <button type="button" class="btn btn-ghost btn-xs" (click)="clearSelection()">✕</button>
            </div>
          </article>
        }
      </ng-template>
    </div>
  `,
  styles: `
    :host { display: block; }
  `,
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private readonly weather = inject(WeatherService);
  readonly ops = inject(OpsStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private subs = new Subscription();

  readonly Math = Math;

  private map?: L.Map;
  private searchMarker?: L.Marker;
  private baseLayers: Record<BaseKey, L.TileLayer> = {} as any;
  private radarTileLayer?: L.TileLayer.WMS;
  private radarImageOverlay?: L.ImageOverlay;
  private warningsLayer?: L.TileLayer;
  private lsrLayer = L.layerGroup();
  private spcLayer = L.layerGroup();
  private camsLayer = L.layerGroup();
  private outagesLayer = L.layerGroup();
  private floodLayer = L.layerGroup();
  private quakesLayer = L.layerGroup();
  private savedLayer = L.layerGroup();
  private camMarkers = new Map<string, L.Marker>();
  private savedMarkers = new Map<string, L.Marker>();
  private radarLoopTimer?: ReturnType<typeof setInterval>;
  private radarRefreshTimer?: ReturnType<typeof setInterval>;
  private radarProducts: RadarProductDef[] = [];

  searchQuery = '';
  searchOpen = false;
  isSearching = false;
  searchError = '';
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  sheetOpen = false;
  selectedLabel: string | null = null;
  activeBase: BaseKey = 'dark';
  nearbyAlerts: WeatherAlert[] = [];
  camsWithCoords: CameraFeedDto[] = [];
  savedLocations: SavedLocation[] = [];
  newPinLabel = 'Home base';
  savingPin = false;

  radarProduct: RadarProductId = 'n0q';
  radarStatus: RadarStatus | null = null;
  radarFrames: RadarScan[] = [];
  radarFrameIndex = 0;
  radarLooping = false;
  radarSiteLabel = 'Nearest NEXRAD…';
  radarAgeLabel = 'Scan age —';
  radarSourceNote = 'IEM NEXRAD / RIDGE';
  radarFrameLabel = 'live';
  outagePairNote = '';
  canLoop = false;

  radarProductChoices: { id: RadarProductId; label: string; short: string }[] = [
    { id: 'n0r', label: 'Reflectivity', short: 'Ref' },
    { id: 'n0q', label: 'Reflectivity HD', short: 'HD' },
    { id: 'n0s', label: 'Velocity (SR)', short: 'Vel' },
  ];

  layers: Record<LayerChip, boolean> = {
    radar: true,
    warnings: true,
    lsr: true,
    spc: false,
    cams: true,
    outages: true,
    flood: true,
    quakes: true,
  };

  layerChips: { key: LayerChip; label: string; short: string }[] = [
    { key: 'radar', label: 'Radar', short: 'Rdr' },
    { key: 'warnings', label: 'Warnings', short: 'Wrn' },
    { key: 'lsr', label: 'Reports', short: 'Rpt' },
    { key: 'spc', label: 'SPC', short: 'SPC' },
    { key: 'cams', label: 'Cams', short: 'Cam' },
    { key: 'outages', label: 'Outages', short: 'Out' },
    { key: 'flood', label: 'Flood', short: 'Fld' },
    { key: 'quakes', label: 'Quakes', short: 'Qke' },
  ];

  baseChips: { key: BaseKey; label: string; short: string }[] = [
    { key: 'street', label: 'Street', short: 'St' },
    { key: 'dark', label: 'Dark', short: 'Dk' },
    { key: 'imagery', label: 'Imagery', short: 'Sat' },
  ];

  ngAfterViewInit(): void {
    const saved = this.readPersist();
    const center: [number, number] = saved
      ? [saved.lat, saved.lng]
      : DEFAULT_CENTER;
    const zoom = saved?.zoom ?? DEFAULT_ZOOM;
    if (saved) {
      this.activeBase = saved.base;
      for (const key of Object.keys(this.layers) as LayerChip[]) {
        this.layers[key] = saved.layers.includes(key);
      }
      // Migrate pre–Phase B Radar+ preference to HD reflectivity product.
      if ((saved.layers as string[]).includes('radarSharp')) {
        this.layers.radar = true;
        this.radarProduct = 'n0q';
      }
    }
    // Unified prefs: hydrate from dashboard mapLayers when logged in (async overlay).
    this.weather.getDashboardPrefs().subscribe(prefs => {
      const csv = (prefs?.mapLayers || '').trim();
      if (!csv || saved) return; // session wins for this visit
      const set = new Set(csv.split(',').map(s => s.trim()).filter(Boolean));
      for (const key of Object.keys(this.layers) as LayerChip[]) {
        this.layers[key] = set.has(key);
      }
      if (this.ops.impactMode()) this.applyImpactLayers();
      else this.applyLayerVisibility();
    });
    if (this.ops.impactMode()) {
      this.applyImpactLayers();
    }

    this.map = L.map('maine-map', {
      center,
      zoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    this.baseLayers.street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap',
    });
    this.baseLayers.dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; CARTO',
    });
    this.baseLayers.imagery = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, attribution: 'Esri' }
    );
    this.baseLayers[this.activeBase].addTo(this.map);

    this.warningsLayer = L.tileLayer.wms(
      'https://mapservices.weather.noaa.gov/eventdriven/services/WWA/watch_warn_adv/MapServer/WMSServer',
      {
        layers: '0,1',
        format: 'image/png',
        transparent: true,
        attribution: 'NOAA NWS',
        opacity: 0.5,
      } as any
    );

    this.applyLayerVisibility();

    this.map.on('moveend', () => this.persistView());
    this.map.on('zoomend', () => this.persistView());

    this.loadCams();
    this.loadLsr();
    this.loadSpc();
    this.loadNearbyAlerts();
    this.loadSavedLocations();
    this.loadOutages();
    this.loadHazards();
    this.loadRadarDesk();
    this.radarRefreshTimer = setInterval(() => this.loadRadarDesk(true), 60_000);

    this.subs.add(
      this.route.queryParamMap.subscribe(params => {
        const cam = params.get('cam');
        if (cam) {
          this.focusCam(cam, true);
        }
        const focus = params.get('focus');
        const id = params.get('id');
        if (focus === 'alert' && id) {
          const alert = this.nearbyAlerts.find(a => a.id === id);
          if (alert) this.focusAlert(alert, true);
          else {
            // Alerts may still be loading — retry once loaded via loadNearbyAlerts
            this.pendingAlertId = id;
          }
        }
      })
    );

    // Fix tile size after layout
    setTimeout(() => this.map?.invalidateSize(), 100);
  }

  private pendingAlertId: string | null = null;

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.stopRadarLoop();
    if (this.radarRefreshTimer) clearInterval(this.radarRefreshTimer);
    this.persistView();
    this.map?.remove();
  }

  toggleLayer(key: LayerChip): void {
    this.layers = { ...this.layers, [key]: !this.layers[key] };
    if (key === 'radar') {
      if (this.layers.radar) this.applyRadarFrame();
      else {
        this.stopRadarLoop();
        this.clearRadarOverlay();
      }
    }
    this.applyLayerVisibility();
    this.persistView();
    this.persistLayersToPrefs();
  }

  setRadarProduct(id: RadarProductId): void {
    if (this.radarProduct === id) return;
    this.radarProduct = id;
    this.stopRadarLoop();
    this.radarFrameIndex = 0;
    this.loadRadarFrames().then(() => this.applyRadarFrame());
  }

  toggleRadarLoop(): void {
    if (!this.canLoop) return;
    if (this.radarLooping) {
      this.stopRadarLoop();
      return;
    }
    if (this.radarFrames.length < 2) return;
    this.radarLooping = true;
    this.radarLoopTimer = setInterval(() => {
      if (!this.radarFrames.length) return;
      this.radarFrameIndex = (this.radarFrameIndex + 1) % this.radarFrames.length;
      this.applyRadarFrame();
    }, 700);
  }

  onRadarFrameScrub(): void {
    if (this.radarLooping) this.stopRadarLoop();
    this.applyRadarFrame();
  }

  setBase(key: BaseKey): void {
    if (!this.map || this.activeBase === key) return;
    this.map.removeLayer(this.baseLayers[this.activeBase]);
    this.activeBase = key;
    this.baseLayers[key].addTo(this.map);
    this.persistView();
  }

  closeSheet(): void {
    this.sheetOpen = false;
    this.clearSelection();
  }

  clearSelection(): void {
    this.selectedLabel = null;
  }

  focusCam(id: string, fromQuery = false): void {
    const marker = this.camMarkers.get(id);
    const cam = this.camsWithCoords.find(c => c.id === id);
    if (!this.map) return;
    if (marker) {
      this.map.flyTo(marker.getLatLng(), 11, { duration: 0.7 });
      setTimeout(() => marker.openPopup(), 400);
      this.selectedLabel = cam?.title ?? id;
    }
    if (fromQuery) {
      this.clearQueryParams(['cam']);
    }
    if (window.matchMedia('(max-width: 767px)').matches) {
      this.sheetOpen = true;
    }
  }

  focusAlert(alert: WeatherAlert, fromQuery = false): void {
    this.selectedLabel = alert.headline;
    // No geometry on alert DTO — fly to default corridor / office region center
    if (this.map) {
      this.map.flyTo(DEFAULT_CENTER, 8, { duration: 0.7 });
    }
    if (fromQuery) {
      this.clearQueryParams(['focus', 'id']);
    }
    if (window.matchMedia('(max-width: 767px)').matches) {
      this.sheetOpen = true;
    }
  }

  openSearch(): void {
    this.searchOpen = true;
    setTimeout(() => this.searchInput?.nativeElement?.focus(), 40);
  }

  closeSearch(): void {
    this.searchOpen = false;
    this.searchError = '';
  }

  async performSearch(): Promise<void> {
    if (!this.searchQuery.trim()) return;
    this.isSearching = true;
    this.searchError = '';
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchQuery + ', Maine')}&limit=1`
      );
      const data = await res.json();
      if (data?.length) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        this.updateSearchMarker(lat, lon, data[0].display_name.split(',').slice(0, 3).join(','));
        this.map?.flyTo([lat, lon], 10, { duration: 0.9 });
        this.closeSearch();
      } else {
        this.searchError = 'Location not found.';
      }
    } catch {
      this.searchError = 'Search failed. Try again.';
    } finally {
      this.isSearching = false;
    }
  }

  private updateSearchMarker(lat: number, lon: number, label: string): void {
    if (!this.map) return;
    if (this.searchMarker) this.map.removeLayer(this.searchMarker);
    this.searchMarker = L.marker([lat, lon]).bindPopup(`<strong>${label}</strong>`).addTo(this.map);
    this.selectedLabel = label;
    setTimeout(() => this.searchMarker?.openPopup(), 500);
  }

  private applyLayerVisibility(): void {
    if (!this.map) return;
    const sync = (layer: L.Layer | undefined, on: boolean) => {
      if (!layer) return;
      if (on && !this.map!.hasLayer(layer)) layer.addTo(this.map!);
      if (!on && this.map!.hasLayer(layer)) this.map!.removeLayer(layer);
    };
    if (!this.layers.radar) {
      this.clearRadarOverlay();
    } else if (!this.radarTileLayer && !this.radarImageOverlay) {
      this.applyRadarFrame();
    } else {
      sync(this.radarTileLayer, true);
      sync(this.radarImageOverlay, true);
    }
    sync(this.warningsLayer, this.layers.warnings);
    sync(this.lsrLayer, this.layers.lsr);
    sync(this.spcLayer, this.layers.spc);
    sync(this.camsLayer, this.layers.cams);
    sync(this.outagesLayer, this.layers.outages);
    sync(this.floodLayer, this.layers.flood);
    sync(this.quakesLayer, this.layers.quakes);
    sync(this.savedLayer, true);
  }

  savePinAtCenter(): void {
    if (!this.map || this.savingPin) return;
    this.savingPin = true;
    const c = this.map.getCenter();
    this.weather.createSavedLocation({
      label: (this.newPinLabel || 'Home base').trim().slice(0, 48) || 'Home base',
      lat: c.lat,
      lon: c.lng,
    }).subscribe(row => {
      this.savingPin = false;
      if (row?.id) {
        this.savedLocations = [...this.savedLocations, row].sort((a, b) =>
          a.label.localeCompare(b.label)
        );
        this.renderSavedMarkers();
        this.selectedLabel = row.label;
        this.focusSavedLocation(row);
      } else {
        this.selectedLabel = 'Log in to save home-base pins';
      }
    });
  }

  focusSavedLocation(loc: SavedLocation): void {
    if (!this.map) return;
    this.map.flyTo([loc.lat, loc.lon], 11, { duration: 0.7 });
    this.selectedLabel = loc.label;
    const marker = this.savedMarkers.get(loc.id);
    if (marker) setTimeout(() => marker.openPopup(), 400);
  }

  removeSavedLocation(id: string): void {
    this.weather.deleteSavedLocation(id).subscribe(() => {
      this.savedLocations = this.savedLocations.filter(l => l.id !== id);
      const marker = this.savedMarkers.get(id);
      if (marker) {
        this.savedLayer.removeLayer(marker);
        this.savedMarkers.delete(id);
      }
      if (this.selectedLabel && !this.savedLocations.some(l => l.label === this.selectedLabel)) {
        this.selectedLabel = null;
      }
    });
  }

  private loadRadarDesk(quiet = false): void {
    const center = this.map?.getCenter();
    const lat = center?.lat ?? DEFAULT_CENTER[0];
    const lon = center?.lng ?? DEFAULT_CENTER[1];
    this.subs.add(
      this.weather.getRadarStatus(lat, lon).subscribe(status => {
        if (!status) {
          if (!quiet) {
            this.radarSiteLabel = 'Radar metadata unavailable';
            this.radarAgeLabel = 'Scan age —';
          }
          return;
        }
        this.radarStatus = status;
        this.radarProducts = status.products || [];
        this.radarSourceNote = status.sourceNote || 'IEM NEXRAD / RIDGE';
        if (status.nearest) {
          const km = status.nearest.distanceKm != null
            ? ` · ${Math.round(status.nearest.distanceKm)} km`
            : '';
          this.radarSiteLabel = `${status.nearest.id} ${status.nearest.name}${km}`;
        } else {
          this.radarSiteLabel = 'Composite only';
        }
        if (status.latestScan?.ageSeconds != null) {
          const mins = Math.max(0, Math.round(status.latestScan.ageSeconds / 60));
          this.radarAgeLabel = mins <= 1
            ? 'Scan age ~1 min'
            : `Scan age ~${mins} min · ${status.latestScan.ts}`;
        } else {
          this.radarAgeLabel = 'Scan age unknown';
        }
        const pair = status.outagePair;
        if (pair) {
          const delta = pair.deltaMeters;
          const deltaTxt = typeof delta === 'number'
            ? (delta > 0 ? `+${delta}` : `${delta}`)
            : '—';
          this.outagePairNote = `Outage pair · ME ${pair.maineMetersOut ?? 0} m (Δ ${deltaTxt}). ${pair.note || ''}`.trim();
        } else {
          this.outagePairNote = '';
        }
        this.loadRadarFrames().then(() => {
          if (this.layers.radar) this.applyRadarFrame();
        });
      })
    );
  }

  private loadRadarFrames(): Promise<void> {
    const def = this.currentRadarProduct();
    if (!def) {
      this.radarFrames = [];
      this.canLoop = false;
      return Promise.resolve();
    }
    return new Promise(resolve => {
      this.weather.getRadarScans(def.scanRadar, def.scanProduct, 2).subscribe(res => {
        this.radarFrames = res?.scans?.length ? res.scans : [];
        this.canLoop = !!(def.loopSupported && this.radarFrames.length >= 2);
        if (this.radarFrameIndex >= this.radarFrames.length) {
          this.radarFrameIndex = Math.max(0, this.radarFrames.length - 1);
        }
        if (!this.radarLooping && this.radarFrames.length) {
          this.radarFrameIndex = this.radarFrames.length - 1;
        }
        resolve();
      });
    });
  }

  private currentRadarProduct(): RadarProductDef | undefined {
    const fromApi = this.radarProducts.find(p => p.id === this.radarProduct);
    if (fromApi) return fromApi;
    // Fallback defs if status not loaded yet
    const fallbacks: Record<RadarProductId, RadarProductDef> = {
      n0r: {
        id: 'n0r', label: 'Reflectivity', kind: 'wms', blurb: '',
        wms: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi',
        layer: 'nexrad-n0r-900913',
        loopWms: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r-t.cgi',
        loopLayer: 'nexrad-n0r-wmst',
        loopSupported: true, scanRadar: 'USCOMP', scanProduct: 'N0R', attribution: 'IEM NEXRAD n0r',
      },
      n0q: {
        id: 'n0q', label: 'Reflectivity HD', kind: 'wms', blurb: '',
        wms: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi',
        layer: 'nexrad-n0q-900913',
        loopWms: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q-t.cgi',
        loopLayer: 'nexrad-n0q-wmst',
        loopSupported: true, scanRadar: 'USCOMP', scanProduct: 'N0Q', attribution: 'IEM NEXRAD n0q',
      },
      n0s: {
        id: 'n0s', label: 'Velocity (SR)', kind: 'ridge', blurb: '',
        loopSupported: true, scanRadar: 'CBW', scanProduct: 'N0S', ridgeProduct: 'N0S',
        ridgeUrl: 'https://mesonet.agron.iastate.edu/data/gis/images/4326/ridge/CBW/N0S_0.png',
        bounds: { south: 40.069, west: -73.776, north: 52.009, east: -61.836 },
        attribution: 'IEM RIDGE N0S',
      },
    };
    return fallbacks[this.radarProduct];
  }

  private frameOverlays = new Map<string, L.ImageOverlay>();

  private applyRadarFrame(): void {
    if (!this.map || !this.layers.radar) return;
    const def = this.currentRadarProduct();
    if (!def) return;
    const frame = this.radarFrames[this.radarFrameIndex];
    const looping = this.radarLooping || (frame && this.radarFrameIndex < this.radarFrames.length - 1);

    if (def.kind === 'ridge' || frame?.ridgeUrl) {
      this.clearRadarTile();
      const url = (looping && frame?.ridgeUrl)
        ? frame.ridgeUrl
        : (def.ridgeUrl || frame?.ridgeUrl);
      const b = def.bounds || { south: 40.069, west: -73.776, north: 52.009, east: -61.836 };
      if (!url || !b) return;
      const bounds = L.latLngBounds([b.south, b.west], [b.north, b.east]);

      // Smooth frame swapping with cached ImageOverlays to prevent flashing
      this.frameOverlays.forEach((overlay, overlayUrl) => {
        if (overlayUrl === url) {
          overlay.setOpacity(0.65);
          overlay.bringToFront();
        } else {
          overlay.setOpacity(0);
        }
      });

      if (!this.frameOverlays.has(url)) {
        const newOverlay = L.imageOverlay(url, bounds, { opacity: 0.65, interactive: false });
        if (this.map) newOverlay.addTo(this.map);
        this.frameOverlays.set(url, newOverlay);
      }

      // Preload next frame for ultra-smooth loop sequence
      if (this.radarFrames.length > 1) {
        const nextIdx = (this.radarFrameIndex + 1) % this.radarFrames.length;
        const nextUrl = this.radarFrames[nextIdx]?.ridgeUrl;
        if (nextUrl && !this.frameOverlays.has(nextUrl)) {
          const img = new Image();
          img.src = nextUrl;
        }
      }
    } else {
      this.clearRadarImage();
      const useLoop = !!(looping && def.loopSupported && frame?.wmsTime && def.loopWms && def.loopLayer);
      const wmsUrl = useLoop ? def.loopWms! : def.wms!;
      const layerName = useLoop ? def.loopLayer! : def.layer!;
      const params: Record<string, string> = {
        layers: layerName,
        format: 'image/png',
        transparent: 'true',
      };
      if (useLoop && frame?.wmsTime) {
        params['time'] = frame.wmsTime;
      }
      if (
        this.radarTileLayer &&
        (this.radarTileLayer as any)._url === wmsUrl
      ) {
        this.radarTileLayer.setParams(params as any);
      } else {
        this.clearRadarTile();
        this.radarTileLayer = L.tileLayer.wms(wmsUrl, {
          layers: layerName,
          format: 'image/png',
          transparent: true,
          attribution: def.attribution,
          opacity: 0.55,
          ...(useLoop && frame?.wmsTime ? { time: frame.wmsTime } : {}),
        } as any);
        this.radarTileLayer.addTo(this.map);
      }
    }

    if (frame?.ts) {
      this.radarFrameLabel = frame.ts.replace('T', ' ').replace('Z', 'Z');
    } else {
      this.radarFrameLabel = 'live';
    }
  }

  private stopRadarLoop(): void {
    this.radarLooping = false;
    if (this.radarLoopTimer) {
      clearInterval(this.radarLoopTimer);
      this.radarLoopTimer = undefined;
    }
  }

  private clearRadarOverlay(): void {
    this.clearRadarTile();
    this.clearRadarImage();
  }

  private clearRadarTile(): void {
    if (this.radarTileLayer && this.map) {
      this.map.removeLayer(this.radarTileLayer);
    }
    this.radarTileLayer = undefined;
  }

  private clearRadarImage(): void {
    this.frameOverlays.forEach(overlay => {
      if (this.map) this.map.removeLayer(overlay);
    });
    this.frameOverlays.clear();
    if (this.radarImageOverlay && this.map) {
      this.map.removeLayer(this.radarImageOverlay);
    }
    this.radarImageOverlay = undefined;
  }

    private loadSavedLocations(): void {
    this.subs.add(
      this.weather.getSavedLocations().subscribe(rows => {
        this.savedLocations = rows || [];
        this.renderSavedMarkers();
        this.applyLayerVisibility();
      })
    );
  }

  private renderSavedMarkers(): void {
    this.savedLayer.clearLayers();
    this.savedMarkers.clear();
    const icon = L.divIcon({
      html: '<span style="font-size:18px;filter:drop-shadow(0 1px 2px #000)">🏠</span>',
      className: '',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    for (const loc of this.savedLocations) {
      const marker = L.marker([loc.lat, loc.lon], { icon }).bindPopup(
        `<strong>${loc.label}</strong><br><span style="font-size:11px;opacity:.7">Saved pin</span>`
      );
      marker.addTo(this.savedLayer);
      this.savedMarkers.set(loc.id, marker);
    }
  }

  private loadCams(): void {
    this.subs.add(
      this.weather.getCams().subscribe(list => {
        this.camsWithCoords = list.filter(
          c => c.group === 'cams' && typeof c.lat === 'number' && typeof c.lng === 'number'
        );
        this.camsLayer.clearLayers();
        this.camMarkers.clear();
        for (const cam of this.camsWithCoords) {
          const color = camHealthColor(cam.health, cam.nearAlertCount);
          const warn = (cam.nearAlertCount || 0) > 0 ? '⚠' : '📷';
          const icon = L.divIcon({
            html: `<span style="font-size:16px;filter:drop-shadow(0 1px 2px #000);color:${color}">${warn}</span>`,
            className: '',
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          });
          const age = cam.ageSec != null
            ? (cam.ageSec < 90 ? `${cam.ageSec}s` : `${Math.round(cam.ageSec / 60)}m`)
            : '—';
          const marker = L.marker([cam.lat!, cam.lng!], { icon }).bindPopup(
            `<strong>${cam.title}</strong><br>` +
              `<span style="font-size:11px;opacity:.7">${cam.corridorLabel || cam.region}</span><br>` +
              `<span style="font-size:11px">Health ${cam.health || cam.status} · age ${age}</span>` +
              ((cam.nearAlertCount || 0) > 0
                ? `<br><span style="font-size:11px;color:#fbbf24;font-weight:700">Near ${cam.nearAlertCount} warning(s)</span>`
                : '') +
              `<br><a href="/live?cam=${encodeURIComponent(cam.id)}" style="color:#38bdf8;font-weight:700">Open Live →</a>`
          );
          marker.addTo(this.camsLayer);
          this.camMarkers.set(cam.id, marker);
        }
        this.applyLayerVisibility();

        const camQ = this.route.snapshot.queryParamMap.get('cam');
        if (camQ) this.focusCam(camQ, true);
      })
    );
  }

  private loadHazards(): void {
    this.subs.add(
      this.weather.getHazardsGeo().subscribe(geo => {
        this.floodLayer.clearLayers();
        this.quakesLayer.clearLayers();
        if (!geo) {
          this.applyLayerVisibility();
          return;
        }
        L.geoJSON(geo as any, {
          pointToLayer: (feature, latlng) => {
            const p = feature.properties || {};
            const kind = String(p['kind'] || '');
            if (kind === 'flood') {
              const sev = String(p['severity'] || 'info');
              const color = sev === 'major' || sev === 'moderate' ? '#2563eb'
                : sev === 'minor' || sev === 'action' ? '#38bdf8'
                : '#64748b';
              const r = sev === 'info' || sev === 'unknown' ? 6 : 9;
              return L.circleMarker(latlng, {
                radius: r,
                color: '#e0f2fe',
                fillColor: color,
                fillOpacity: 0.85,
                weight: 1,
              });
            }
            const mag = Number(p['magnitude'] || 0);
            const color = mag >= 3.5 ? '#ef4444' : mag >= 3 ? '#f97316' : '#a855f7';
            return L.circleMarker(latlng, {
              radius: Math.max(5, Math.min(14, 4 + mag * 2)),
              color: '#fce7f3',
              fillColor: color,
              fillOpacity: 0.85,
              weight: 1,
            });
          },
          onEachFeature: (feature, layer) => {
            const p = feature.properties || {};
            const kind = String(p['kind'] || '');
            const extra = kind === 'flood'
              ? `Stage ${p['stage'] ?? '—'} ${p['stageUnit'] || 'ft'}`
              : `M${p['magnitude'] ?? '—'} · depth ${p['depthKm'] ?? '—'} km`;
            layer.bindPopup(
              `<strong>${p['headline'] || kind}</strong><br>` +
                `<span style="font-size:11px">${extra}</span><br>` +
                `<span style="font-size:10px;opacity:.7">${p['source'] || ''} · ${p['severity'] || ''}</span>`
            );
            if (kind === 'flood') layer.addTo(this.floodLayer);
            else if (kind === 'quake') layer.addTo(this.quakesLayer);
          },
        });
        this.applyLayerVisibility();
      })
    );
  }

  private loadOutages(): void {
    this.subs.add(
      this.weather.getOutagesGeo().subscribe(geo => {
        this.outagesLayer.clearLayers();
        if (!geo) {
          this.applyLayerVisibility();
          return;
        }
        L.geoJSON(geo as any, {
          style: feature => {
            const meters = Number(feature?.properties?.['metersOut'] || 0);
            const fill = meters <= 0
              ? '#334155'
              : meters < 50
                ? '#fbbf24'
                : meters < 500
                  ? '#f97316'
                  : '#ef4444';
            return {
              color: meters > 0 ? '#fef3c7' : '#64748b',
              weight: 1,
              fillColor: fill,
              fillOpacity: meters > 0 ? 0.45 : 0.12,
            };
          },
          onEachFeature: (feature, layer) => {
            const p = feature.properties || {};
            const meters = Number(p['metersOut'] || 0);
            layer.bindPopup(
              `<strong>${p['name'] || 'County'} Co.</strong><br>` +
                `<span style="font-size:12px;font-weight:800">${meters.toLocaleString()} meters out</span><br>` +
                `<span style="font-size:10px;opacity:.7">ODIN estimate · see utility map for local detail</span>`
            );
          },
        }).addTo(this.outagesLayer);
        this.applyLayerVisibility();
      })
    );
  }

  private loadLsr(): void {
    this.subs.add(
      this.weather.getLsrGeoJson(24).subscribe(geo => {
        this.lsrLayer.clearLayers();
        L.geoJSON(geo as any, {
          pointToLayer: (_f, latlng) =>
            L.circleMarker(latlng, {
              radius: 6,
              color: '#f59e0b',
              fillColor: '#fbbf24',
              fillOpacity: 0.9,
              weight: 1,
            }),
          onEachFeature: (feature, layer) => {
            const p = feature.properties || {};
            const mag = p.magnitude != null ? ` ${p.magnitude}${p.unit || ''}` : '';
            layer.bindPopup(
              `<strong>${p.typetext || p.type || 'Report'}${mag}</strong><br>` +
                `<span style="font-size:11px">${p.city || p.county || ''} ${p.state || ''}</span><br>` +
                `<span style="font-size:11px;opacity:.75">${p.remark || ''}</span>`
            );
          },
        }).addTo(this.lsrLayer);
        this.applyLayerVisibility();
      })
    );
  }

  private loadSpc(): void {
    this.subs.add(
      this.weather.getSpcOutlook().subscribe(geo => {
        this.spcLayer.clearLayers();
        L.geoJSON(geo as any, {
          style: feature => {
            const label = String(feature?.properties?.LABEL || feature?.properties?.label || '').toUpperCase();
            const colors: Record<string, string> = {
              TSTM: '#c1e9c1',
              MRGL: '#66c266',
              SLGT: '#f6f67f',
              ENH: '#e0a060',
              MDT: '#e07070',
              HIGH: '#ff40ff',
            };
            return {
              color: colors[label] || '#94a3b8',
              fillColor: colors[label] || '#94a3b8',
              weight: 1,
              fillOpacity: 0.25,
              opacity: 0.7,
            };
          },
          onEachFeature: (feature, layer) => {
            const p = feature.properties || {};
            layer.bindPopup(`<strong>SPC ${p.LABEL || p.label || 'Outlook'}</strong><br>${p.LABEL2 || ''}`);
          },
        }).addTo(this.spcLayer);
        this.applyLayerVisibility();
      })
    );
  }

  private loadNearbyAlerts(): void {
    this.subs.add(
      this.weather.getAlerts().subscribe(res => {
        this.nearbyAlerts = (res.alerts || [])
          .filter(a => (a.scope || '').toLowerCase() === 'maine' || /maine|me\b/i.test(a.area || ''))
          .slice(0, 8);
        if (!this.nearbyAlerts.length) {
          this.nearbyAlerts = (res.alerts || []).slice(0, 8);
        }
        if (this.pendingAlertId) {
          const alert = this.nearbyAlerts.find(a => a.id === this.pendingAlertId);
          if (alert) {
            this.focusAlert(alert, true);
            this.pendingAlertId = null;
          }
        }
      })
    );
  }

  private savedPreImpactLayers?: Record<LayerChip, boolean>;

  toggleImpactMode(): void {
    const turningOn = !this.ops.impactMode();
    if (turningOn) {
      this.savedPreImpactLayers = { ...this.layers };
    }
    this.ops.toggleImpactMode();
    if (this.ops.impactMode()) {
      const keep: LayerChip[] = ['radar', 'warnings', 'cams', 'outages', 'flood'];
      for (const key of Object.keys(this.layers) as LayerChip[]) {
        this.layers[key] = keep.includes(key);
      }
    } else if (this.savedPreImpactLayers) {
      this.layers = { ...this.savedPreImpactLayers };
    } else {
      this.layers = {
        radar: true,
        warnings: true,
        lsr: false,
        spc: false,
        cams: false,
        outages: false,
        flood: false,
        quakes: false,
      };
    }
    this.applyLayerVisibility();
    this.persistView();
    this.persistLayersToPrefs();
  }

  private applyImpactLayers(): void {
    if (!this.ops.impactMode()) return;
    const keep: LayerChip[] = ['radar', 'warnings', 'cams', 'outages', 'flood'];
    for (const key of Object.keys(this.layers) as LayerChip[]) {
      this.layers[key] = keep.includes(key);
    }
    this.applyLayerVisibility();
  }

  private persistLayersToPrefs(): void {
    const csv = (Object.keys(this.layers) as LayerChip[]).filter(k => this.layers[k]).join(',');
    this.weather.getDashboardPrefs().subscribe(prefs => {
      if (!prefs) return;
      this.weather.saveDashboardPrefs({ ...prefs, mapLayers: csv }).subscribe();
    });
  }

  private persistView(): void {
    if (!this.map) return;
    const c = this.map.getCenter();
    const payload: MapPersist = {
      lat: c.lat,
      lng: c.lng,
      zoom: this.map.getZoom(),
      base: this.activeBase,
      layers: (Object.keys(this.layers) as LayerChip[]).filter(k => this.layers[k]),
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch { /* ignore */ }
  }

  private readPersist(): MapPersist | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as MapPersist;
    } catch {
      return null;
    }
  }

  private clearQueryParams(keys: string[]): void {
    const next: Record<string, null> = {};
    for (const k of keys) next[k] = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: next,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}

function camHealthColor(health?: string, nearCount?: number): string {
  if ((nearCount || 0) > 0) return '#fbbf24';
  switch ((health || '').toLowerCase()) {
    case 'ok':
      return '#4ade80';
    case 'stale':
      return '#fbbf24';
    case 'black':
    case 'error':
      return '#f87171';
    case 'pending':
      return '#94a3b8';
    default:
      return '#e2e8f0';
  }
}
