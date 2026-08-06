import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';

import { CameraFeedDto, SavedLocation, WeatherAlert, WeatherService } from '../../core/weather.service';

type BaseKey = 'street' | 'dark' | 'imagery';
type LayerChip = 'radar' | 'radarSharp' | 'warnings' | 'lsr' | 'spc' | 'cams' | 'outages';

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
          Northern Maine / St. John Valley · radar, hazards, reports, outages, live cams
        </p>
      </div>

      <div class="flex-1 flex flex-col md:flex-row gap-0 md:gap-4 max-w-7xl mx-auto w-full md:px-2 min-h-0">
        <!-- Map canvas -->
        <section class="relative flex-1 min-h-[55vh] md:min-h-[640px] md:rounded-2xl overflow-hidden border-0 md:border md:border-base-300">
          <div id="maine-map" class="absolute inset-0 z-0"></div>

          <!-- Top search (compact) -->
          <div class="absolute top-3 left-3 right-3 md:right-auto md:w-80 z-[1000]">
            <div class="storm-card p-2 flex gap-2 items-center">
              <input
                type="text"
                placeholder="Search town…"
                class="input input-sm input-ghost w-full font-semibold focus:outline-none"
                [(ngModel)]="searchQuery"
                (keyup.enter)="performSearch()"
              >
              <button
                type="button"
                class="btn btn-primary btn-sm rounded-lg font-black uppercase shrink-0 min-h-10"
                (click)="performSearch()"
                [disabled]="isSearching"
              >
                @if (isSearching) {
                  <span class="loading loading-spinner loading-xs"></span>
                } @else {
                  Go
                }
              </button>
            </div>
            @if (searchError) {
              <p class="mt-1 text-error text-xs font-bold px-1">{{ searchError }}</p>
            }
          </div>

          <!-- Desktop layer chips -->
          <div class="hidden md:flex absolute bottom-4 left-4 right-4 z-[1000] flex-wrap gap-1.5 pointer-events-none">
            <div class="pointer-events-auto storm-card p-2 flex flex-wrap gap-1.5 max-w-full">
              @for (chip of layerChips; track chip.key) {
                <button
                  type="button"
                  class="btn btn-xs rounded-lg font-black uppercase tracking-wider min-h-9"
                  [ngClass]="layers[chip.key] ? 'btn-primary' : 'btn-ghost border border-base-300'"
                  (click)="toggleLayer(chip.key)"
                >
                  {{ chip.label }}
                </button>
              }
              <div class="w-px bg-base-300 mx-1 self-stretch"></div>
              @for (b of baseChips; track b.key) {
                <button
                  type="button"
                  class="btn btn-xs rounded-lg font-bold uppercase tracking-wider min-h-9"
                  [ngClass]="activeBase === b.key ? 'btn-secondary' : 'btn-ghost border border-base-300'"
                  (click)="setBase(b.key)"
                >
                  {{ b.label }}
                </button>
              }
            </div>
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private subs = new Subscription();

  private map?: L.Map;
  private searchMarker?: L.Marker;
  private baseLayers: Record<BaseKey, L.TileLayer> = {} as any;
  private radarLayer?: L.TileLayer;
  private radarSharpLayer?: L.TileLayer;
  private warningsLayer?: L.TileLayer;
  private lsrLayer = L.layerGroup();
  private spcLayer = L.layerGroup();
  private camsLayer = L.layerGroup();
  private outagesLayer = L.layerGroup();
  private savedLayer = L.layerGroup();
  private camMarkers = new Map<string, L.Marker>();
  private savedMarkers = new Map<string, L.Marker>();

  searchQuery = '';
  isSearching = false;
  searchError = '';
  sheetOpen = false;
  selectedLabel: string | null = null;
  activeBase: BaseKey = 'dark';
  nearbyAlerts: WeatherAlert[] = [];
  camsWithCoords: CameraFeedDto[] = [];
  savedLocations: SavedLocation[] = [];
  newPinLabel = 'Home base';
  savingPin = false;

  layers: Record<LayerChip, boolean> = {
    radar: true,
    radarSharp: false,
    warnings: true,
    lsr: true,
    spc: false,
    cams: true,
    outages: true,
  };

  layerChips: { key: LayerChip; label: string }[] = [
    { key: 'radar', label: 'Radar' },
    { key: 'radarSharp', label: 'Radar+' },
    { key: 'warnings', label: 'Warnings' },
    { key: 'lsr', label: 'Reports' },
    { key: 'spc', label: 'SPC' },
    { key: 'cams', label: 'Cams' },
    { key: 'outages', label: 'Outages' },
  ];

  baseChips: { key: BaseKey; label: string }[] = [
    { key: 'street', label: 'Street' },
    { key: 'dark', label: 'Dark' },
    { key: 'imagery', label: 'Imagery' },
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

    this.radarLayer = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi', {
      layers: 'nexrad-n0r-900913',
      format: 'image/png',
      transparent: true,
      attribution: 'IEM NEXRAD',
      opacity: 0.55,
    } as any);

    this.radarSharpLayer = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi', {
      layers: 'nexrad-n0q-900913',
      format: 'image/png',
      transparent: true,
      attribution: 'IEM NEXRAD n0q',
      opacity: 0.55,
    } as any);

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
    this.persistView();
    this.map?.remove();
  }

  toggleLayer(key: LayerChip): void {
    this.layers = { ...this.layers, [key]: !this.layers[key] };
    this.applyLayerVisibility();
    this.persistView();
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
    sync(this.radarLayer, this.layers.radar);
    sync(this.radarSharpLayer, this.layers.radarSharp);
    sync(this.warningsLayer, this.layers.warnings);
    sync(this.lsrLayer, this.layers.lsr);
    sync(this.spcLayer, this.layers.spc);
    sync(this.camsLayer, this.layers.cams);
    sync(this.outagesLayer, this.layers.outages);
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
        const icon = L.divIcon({
          html: '<span style="font-size:18px;filter:drop-shadow(0 1px 2px #000)">📷</span>',
          className: '',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        for (const cam of this.camsWithCoords) {
          const marker = L.marker([cam.lat!, cam.lng!], { icon }).bindPopup(
            `<strong>${cam.title}</strong><br>` +
              `<span style="font-size:11px;opacity:.7">${cam.region}</span><br>` +
              `<a href="/live?cam=${encodeURIComponent(cam.id)}" style="color:#38bdf8;font-weight:700">Open Live →</a>`
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
