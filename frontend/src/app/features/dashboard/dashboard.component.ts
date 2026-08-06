import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as L from 'leaflet';
import { AuthService } from '../../core/auth.service';
import { OpsStateService } from '../../core/ops-state.service';
import { vehicleSvg } from '../../core/vehicles';
import {
  AreaOutageInfo,
  DashboardPrefs,
  VehicleDef,
  WatchedArea,
  WeatherAlert,
  WeatherService,
} from '../../core/weather.service';

type CardKey = 'profile' | 'progress' | 'garage' | 'loot' | 'cams' | 'areas' | 'map';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-[calc(100vh-4rem)] p-4 md:p-6">
      <div class="max-w-6xl mx-auto space-y-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Live ops desk</p>
            <h1 class="text-3xl font-black text-white italic uppercase tracking-wider font-sans">Dashboard</h1>
            <p class="text-sm text-base-content/55 font-semibold mt-1">
              Your cams, watch zones, scores, and garage — updates without reloading the app.
            </p>
          </div>
          <div class="flex gap-2">
            <button type="button" class="btn btn-sm btn-ghost border border-base-300 rounded-xl font-bold uppercase" (click)="editLayout = !editLayout">
              {{ editLayout ? 'Done' : 'Layout' }}
            </button>
            <a routerLink="/play" class="btn btn-sm btn-primary rounded-xl font-black uppercase">Play</a>
          </div>
        </div>

        @if (editLayout) {
          <article class="storm-card p-3 flex flex-wrap gap-2">
            @for (key of allCards; track key) {
              <button
                type="button"
                class="btn btn-xs rounded-lg font-black uppercase min-h-10"
                [ngClass]="isHidden(key) ? 'btn-ghost border border-base-300' : 'btn-secondary'"
                (click)="toggleCard(key)"
              >{{ key }}</button>
            }
          </article>
        }

        <div class="grid gap-3 lg:grid-cols-2">
          @for (key of visibleCards; track key) {
            @switch (key) {
              @case ('profile') {
                <article class="storm-card p-4 space-y-2">
                  <h2 class="text-xs font-black uppercase tracking-widest text-primary">Profile</h2>
                  @if (auth.user(); as u) {
                    <div class="flex items-center gap-3">
                      <div class="w-12 h-8 shrink-0" [innerHTML]="svg(u.equippedVehicleKey)"></div>
                      <div class="min-w-0 flex-1">
                        <div class="text-xl font-black text-white italic">{{ u.chaserName }}</div>
                        <div class="text-[10px] uppercase tracking-wider text-primary font-black">
                          Level {{ u.level }} · {{ u.levelTitle }}
                        </div>
                        <div class="mt-1.5 h-1.5 rounded-full bg-base-300 overflow-hidden max-w-[12rem]">
                          <div
                            class="h-full bg-primary"
                            [style.width.%]="xpBarPct(u.xpIntoLevel, u.xpForNext)"
                          ></div>
                        </div>
                        <div class="text-[10px] uppercase tracking-wider text-base-content/45 font-bold mt-1">
                          {{ u.xpIntoLevel }}/{{ u.xpForNext }} XP · {{ u.vehicleKeys.length }} vehicles
                          · {{ lootCount(u) }} loot
                        </div>
                      </div>
                    </div>
                  }
                </article>
              }
              @case ('loot') {
                <article class="storm-card p-4 space-y-2">
                  <h2 class="text-xs font-black uppercase tracking-widest text-accent">Field loot</h2>
                  @if (!(auth.user()?.loot?.length)) {
                    <p class="text-xs text-base-content/50 font-semibold">
                      Bag drops in <a routerLink="/play" class="text-primary underline">Storm World</a>
                      then craft or trade at <a routerLink="/trade" class="text-accent underline">Trade</a>.
                    </p>
                  } @else {
                    <ul class="space-y-1.5 max-h-40 overflow-y-auto">
                      @for (item of auth.user()!.loot!; track item.key) {
                        <li class="flex items-center justify-between gap-2 text-sm">
                          <div class="min-w-0">
                            <div class="font-bold text-white truncate">{{ item.name }}</div>
                            <div class="text-[10px] uppercase tracking-wider text-base-content/40 font-bold">{{ item.rarity }}</div>
                          </div>
                          <span class="font-black text-accent tabular-nums">×{{ item.count }}</span>
                        </li>
                      }
                    </ul>
                    <a routerLink="/trade" class="btn btn-ghost btn-xs font-black uppercase">Open Trade & Craft</a>
                  }
                </article>
              }
              @case ('progress') {
                <article class="storm-card p-4 space-y-2">
                  <h2 class="text-xs font-black uppercase tracking-widest text-secondary">Quiz progress</h2>
                  @if (auth.user(); as u) {
                    <p class="text-xs font-semibold text-base-content/60">
                      Level {{ u.level }} {{ u.levelTitle }} — keep training to unlock garage trucks.
                    </p>
                  }
                  @if (ops.myAttempts().length === 0) {
                    <p class="text-xs text-base-content/50 font-semibold">No saved attempts yet — hit Play.</p>
                  } @else {
                    <ul class="space-y-1.5 max-h-40 overflow-y-auto">
                      @for (a of ops.myAttempts().slice(0, 8); track a.id) {
                        <li class="flex justify-between text-sm gap-2">
                          <span class="font-bold text-white truncate">{{ a.category }}</span>
                          <span class="font-black text-accent tabular-nums">{{ a.score }}/{{ a.total }}</span>
                        </li>
                      }
                    </ul>
                  }
                </article>
              }
              @case ('garage') {
                <article class="storm-card p-4 space-y-3 lg:col-span-2">
                  <h2 class="text-xs font-black uppercase tracking-widest text-accent">Garage</h2>
                  <div class="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    @for (v of catalog; track v.key) {
                      <button
                        type="button"
                        class="rounded-xl border p-2.5 text-left min-h-20 transition-colors"
                        [ngClass]="owned(v.key) ? 'border-primary/50 bg-primary/5' : 'border-base-300 opacity-60'"
                        [disabled]="!owned(v.key)"
                        (click)="equip(v.key)"
                      >
                        <div class="w-full max-w-[7.5rem] h-7 mb-1.5 mx-auto" [innerHTML]="svg(v.key)"></div>
                        <div class="font-black text-white text-sm">{{ v.name }}</div>
                        <div class="text-[10px] text-base-content/50 font-semibold">
                          {{ owned(v.key) ? (equipped(v.key) ? 'Equipped' : 'Tap to equip') : v.unlockHint }}
                        </div>
                      </button>
                    }
                  </div>
                </article>
              }
              @case ('cams') {
                <article class="storm-card p-4 space-y-2">
                  <h2 class="text-xs font-black uppercase tracking-widest text-secondary">Favorite cams</h2>
                  @if (favoriteCams.length === 0) {
                    <p class="text-xs text-base-content/50 font-semibold">
                      Star cams on <a routerLink="/live" class="text-primary underline">Live</a>.
                    </p>
                  } @else {
                    <div class="space-y-1.5 max-h-48 overflow-y-auto">
                      @for (cam of favoriteCams; track cam.id) {
                        <a class="flex items-center gap-2 rounded-lg border border-base-300/60 px-2 py-2 hover:border-primary" [routerLink]="['/live']" [queryParams]="{ cam: cam.id }">
                          <span class="text-xs font-black text-white truncate flex-1">{{ cam.title }}</span>
                          <span class="text-[10px] text-base-content/40 font-bold">Open</span>
                        </a>
                      }
                    </div>
                  }
                </article>
              }
              @case ('areas') {
                <article class="storm-card p-4 space-y-3">
                  <h2 class="text-xs font-black uppercase tracking-widest text-primary">Watched areas</h2>
                  <div class="grid gap-2 sm:grid-cols-2">
                    <input class="input input-sm input-bordered bg-base-200/80 rounded-lg font-semibold" placeholder="Label" [(ngModel)]="newAreaLabel">
                    <select class="select select-sm select-bordered bg-base-200/80 rounded-lg font-semibold" [(ngModel)]="newAreaRadius">
                      <option [ngValue]="25">25 mi</option>
                      <option [ngValue]="50">50 mi</option>
                      <option [ngValue]="100">100 mi</option>
                      <option [ngValue]="150">150 mi</option>
                    </select>
                  </div>
                  <button type="button" class="btn btn-primary btn-sm rounded-xl font-black uppercase min-h-11 w-full" (click)="addAreaAtMapCenter()">
                    Pin zone at dashboard map center
                  </button>
                  <div class="space-y-2 max-h-56 overflow-y-auto">
                    @for (area of ops.watchedAreas(); track area.id) {
                      <div class="rounded-lg border border-base-300/60 p-2 space-y-1">
                        <div class="flex items-center gap-2">
                          <button type="button" class="flex-1 text-left min-h-10" (click)="expandArea(area)">
                            <div class="text-xs font-black text-white">{{ area.label }}</div>
                            <div class="text-[10px] text-base-content/45 font-semibold">{{ area.radiusMiles }} mi radius</div>
                          </button>
                          <button type="button" class="btn btn-ghost btn-xs text-error" (click)="removeArea(area.id)">✕</button>
                        </div>
                        @if (expandedId === area.id) {
                          <div class="text-[10px] font-bold uppercase tracking-wider text-accent">
                            {{ expandedAlerts.length }} alert(s) in range
                          </div>
                          @if (expandedOutage) {
                            <div class="text-[10px] font-semibold text-base-content/60">
                              {{ expandedOutage.county }} Co. ·
                              @if (expandedOutage.maineCovered || expandedOutage.metersOut > 0) {
                                {{ expandedOutage.metersOut | number }} meters out (ODIN)
                              } @else {
                                no ODIN reporters for ME — check utility map
                              }
                            </div>
                          }
                          <ul class="space-y-1">
                            @for (al of expandedAlerts.slice(0, 6); track al.id) {
                              <li class="text-xs font-semibold text-base-content/70">
                                {{ al.headline }}
                                @if (al.approximate) {
                                  <span class="text-warning"> · approx</span>
                                }
                              </li>
                            }
                          </ul>
                        }
                      </div>
                    }
                  </div>
                </article>
              }
              @case ('map') {
                <article class="storm-card p-3 lg:col-span-2">
                  <h2 class="text-xs font-black uppercase tracking-widest text-accent mb-2">Ops map</h2>
                  <div id="dash-map" class="h-72 w-full rounded-xl overflow-hidden border border-base-300 relative z-0"></div>
                  <p class="text-[10px] text-base-content/40 font-semibold mt-2">
                    Watched circles + favorite cam pins. {{ ops.alerts().length }} live alerts in shared feed
                    @if (ops.refreshing()) { · refreshing… }
                  </p>
                </article>
              }
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly ops = inject(OpsStateService);
  private readonly weather = inject(WeatherService);
  private readonly sanitizer = inject(DomSanitizer);

  allCards: CardKey[] = ['profile', 'progress', 'garage', 'loot', 'cams', 'areas', 'map'];
  visibleCards: CardKey[] = [...this.allCards];
  hidden = new Set<string>();
  editLayout = false;
  catalog: VehicleDef[] = [];
  prefs: DashboardPrefs = { cardOrder: '', hiddenCards: '', mapLayers: '' };

  newAreaLabel = 'Home corridor';
  newAreaRadius = 50;
  expandedId: string | null = null;
  expandedAlerts: WeatherAlert[] = [];
  expandedOutage: AreaOutageInfo | null = null;

  private map?: L.Map;
  private layer = L.layerGroup();

  get favoriteCams() {
    const ids = new Set(this.ops.favoriteCamIds());
    return this.ops.cams().filter(c => ids.has(c.id));
  }

  ngOnInit(): void {
    this.weather.getVehicleCatalog().subscribe(c => this.catalog = c);
    this.weather.getDashboardPrefs().subscribe(p => {
      this.prefs = p;
      this.applyPrefs();
    });
    this.ops.reloadAccountData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 50);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  svg(key: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(vehicleSvg(key));
  }

  xpBarPct(into: number, need: number): number {
    if (!need || need <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((into / need) * 100)));
  }

  lootCount(u: { loot?: { count: number }[] }): number {
    return (u.loot || []).reduce((sum, item) => sum + (item.count || 0), 0);
  }

  owned(key: string): boolean {
    return !!this.auth.user()?.vehicleKeys?.includes(key);
  }

  equipped(key: string): boolean {
    return this.auth.user()?.equippedVehicleKey === key;
  }

  equip(key: string): void {
    if (!this.owned(key)) return;
    this.auth.equipVehicle(key).subscribe();
  }

  isHidden(key: string): boolean {
    return this.hidden.has(key);
  }

  toggleCard(key: CardKey): void {
    if (this.hidden.has(key)) this.hidden.delete(key);
    else this.hidden.add(key);
    this.visibleCards = this.allCards.filter(k => !this.hidden.has(k));
    this.persistPrefs();
  }

  addAreaAtMapCenter(): void {
    if (!this.map) return;
    const c = this.map.getCenter();
    this.weather.createWatchedArea({
      label: this.newAreaLabel,
      lat: c.lat,
      lon: c.lng,
      radiusMiles: this.newAreaRadius,
    }).subscribe(row => {
      if (row?.id) {
        this.ops.reloadAccountData();
        setTimeout(() => this.redrawMap(), 200);
      }
    });
  }

  removeArea(id: string): void {
    this.weather.deleteWatchedArea(id).subscribe(() => {
      if (this.expandedId === id) {
        this.expandedId = null;
        this.expandedAlerts = [];
        this.expandedOutage = null;
      }
      this.ops.reloadAccountData();
      setTimeout(() => this.redrawMap(), 200);
    });
  }

  expandArea(area: WatchedArea): void {
    if (this.expandedId === area.id) {
      this.expandedId = null;
      this.expandedAlerts = [];
      this.expandedOutage = null;
      return;
    }
    this.expandedId = area.id;
    this.weather.expandWatchedArea(area.id).subscribe(res => {
      this.expandedAlerts = res.alerts || [];
      this.expandedOutage = res.outage || null;
      this.map?.flyTo([area.lat, area.lon], 8, { duration: 0.6 });
    });
  }

  private applyPrefs(): void {
    const order = (this.prefs.cardOrder || '').split(',').map(s => s.trim()).filter(Boolean) as CardKey[];
    const hidden = new Set((this.prefs.hiddenCards || '').split(',').map(s => s.trim()).filter(Boolean));
    this.hidden = hidden;
    const base = order.length ? order : this.allCards;
    const known = base.filter(k => this.allCards.includes(k));
    for (const k of this.allCards) {
      if (!known.includes(k)) known.push(k);
    }
    this.allCards = known;
    this.visibleCards = known.filter(k => !hidden.has(k));
  }

  private persistPrefs(): void {
    this.prefs = {
      ...this.prefs,
      cardOrder: this.allCards.join(','),
      hiddenCards: [...this.hidden].join(','),
    };
    this.weather.saveDashboardPrefs(this.prefs).subscribe();
  }

  private initMap(): void {
    const el = document.getElementById('dash-map');
    if (!el || this.map) return;
    this.map = L.map(el, { center: [47.05, -68.35], zoom: 7, zoomControl: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; CARTO',
    }).addTo(this.map);
    this.layer.addTo(this.map);
    this.redrawMap();
    setTimeout(() => this.map?.invalidateSize(), 100);
  }

  private redrawMap(): void {
    if (!this.map) return;
    this.layer.clearLayers();
    for (const area of this.ops.watchedAreas()) {
      L.circle([area.lat, area.lon], {
        radius: area.radiusMiles * 1609.34,
        color: '#38bdf8',
        fillColor: '#38bdf8',
        fillOpacity: 0.12,
        weight: 1,
      }).bindPopup(`<strong>${area.label}</strong><br>${area.radiusMiles} mi`).addTo(this.layer);
    }
    const fav = new Set(this.ops.favoriteCamIds());
    for (const cam of this.ops.cams()) {
      if (!fav.has(cam.id) || cam.lat == null || cam.lng == null) continue;
      L.circleMarker([cam.lat, cam.lng], {
        radius: 6,
        color: '#f472b6',
        fillColor: '#f472b6',
        fillOpacity: 0.9,
      }).bindPopup(cam.title).addTo(this.layer);
    }
  }
}
