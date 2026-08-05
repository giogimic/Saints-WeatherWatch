import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import * as L from 'leaflet';

type OverlayKey = 'radar' | 'warnings' | 'reports' | 'wind';

interface Tracker {
  name: string;
  region: string;
  status: string;
  wind: string;
  note: string;
  coordinates: [number, number];
  overlay: OverlayKey;
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-[calc(100vh-4rem)] p-6">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-8">
          <span class="text-6xl mb-4 block">🗺️</span>
          <h1 class="text-4xl font-bold text-primary mb-3">Maine Storm Tracker Board</h1>
          <p class="text-base-content/60 max-w-4xl mx-auto">
            A Maine-focused live map workspace with Leaflet overlay controls, tracker markers, and regional weather panels for the Gulf of Maine corridor.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-4 mb-6">
          <div class="stat bg-base-200 rounded-box shadow-sm">
            <div class="stat-title">Maine trackers</div>
            <div class="stat-value text-primary">6</div>
            <div class="stat-desc">Local sectors monitored</div>
          </div>
          <div class="stat bg-base-200 rounded-box shadow-sm">
            <div class="stat-title">Overlay mode</div>
            <div class="stat-value text-secondary">{{ overlayLabels[activeOverlay].label }}</div>
            <div class="stat-desc">Currently selected layer</div>
          </div>
          <div class="stat bg-base-200 rounded-box shadow-sm">
            <div class="stat-title">Coastal warnings</div>
            <div class="stat-value text-accent">4</div>
            <div class="stat-desc">Active watch / advisory lanes</div>
          </div>
          <div class="stat bg-base-200 rounded-box shadow-sm">
            <div class="stat-title">Sync status</div>
            <div class="stat-value text-success">LIVE</div>
            <div class="stat-desc">Regional feed connected</div>
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <section class="card bg-base-200/70 border border-base-300 shadow-xl p-4">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="text-xl font-bold text-primary">Overlay Tools</h2>
                <p class="text-sm text-base-content/60">Choose the live map layer you want to inspect.</p>
              </div>
              <div class="badge badge-info badge-outline">Maine Focus</div>
            </div>

            <div class="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
              @for (item of overlayKeys; track item) {
                <button
                  type="button"
                  class="btn {{ activeOverlay === item ? 'btn-primary' : 'btn-ghost' }} justify-start"
                  (click)="setOverlay(item)"
                >
                  <span class="mr-2">{{ overlayLabels[item].icon }}</span>
                  {{ overlayLabels[item].label }}
                </button>
              }
            </div>

            <div class="mt-4 rounded-2xl border border-base-300 bg-base-300/40 p-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-xs uppercase tracking-[0.2em] text-base-content/50">Current overlay</div>
                  <h3 class="text-lg font-bold text-base-content">{{ overlayLabels[activeOverlay].label }}</h3>
                </div>
                <span class="text-3xl">{{ overlayLabels[activeOverlay].icon }}</span>
              </div>
              <p class="mt-2 text-sm text-base-content/70">
                {{ overlayLabels[activeOverlay].description }}
              </p>
            </div>

            <div id="maine-map" class="mt-4 h-[420px] w-full rounded-2xl overflow-hidden border border-base-300"></div>
          </section>

          <section class="card bg-base-200/70 border border-base-300 shadow-xl p-4">
            <h2 class="text-xl font-bold text-accent mb-2">Regional Tracker Summary</h2>
            <div class="space-y-3">
              <div class="rounded-xl bg-base-300/40 p-3">
                <div class="text-xs uppercase tracking-[0.2em] text-base-content/50">Primary focus</div>
                <div class="font-semibold">Portland ↔ Bangor corridor</div>
              </div>
              <div class="rounded-xl bg-base-300/40 p-3">
                <div class="text-xs uppercase tracking-[0.2em] text-base-content/50">Current pattern</div>
                <div class="font-semibold">Cold front moving east, coastal wind increase</div>
              </div>
              <div class="rounded-xl bg-base-300/40 p-3">
                <div class="text-xs uppercase tracking-[0.2em] text-base-content/50">Risk zone</div>
                <div class="font-semibold">Downeast and mid-coast bands</div>
              </div>
            </div>
          </section>
        </div>

        <section class="mt-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-secondary">Tracker Nodes</h2>
            <div class="badge badge-secondary badge-outline">Coastal Maine / inland crossovers</div>
          </div>

          <div class="mb-4 rounded-2xl border border-base-300 bg-base-300/40 p-3 text-sm text-base-content/70">
            <span class="font-semibold text-base-content">Selected tracker:</span>
            {{ selectedTrackerName ?? 'None' }}
          </div>

          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            @for (tracker of trackers; track tracker.name) {
              <button
                type="button"
                class="card bg-base-200/70 border border-base-300 shadow-lg text-left transition hover:-translate-y-0.5 hover:border-primary {{ selectedTrackerName === tracker.name ? 'ring-2 ring-primary' : '' }}"
                (click)="selectTracker(tracker.name)"
              >
                <div class="card-body">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <div class="badge badge-outline mb-2">{{ tracker.region }}</div>
                      <h3 class="card-title text-lg">{{ tracker.name }}</h3>
                    </div>
                    <div class="text-right">
                      <div class="text-sm font-semibold text-success">{{ tracker.status }}</div>
                      <div class="text-xs text-base-content/60">{{ tracker.wind }}</div>
                    </div>
                  </div>
                  <p class="mt-2 text-sm text-base-content/70">{{ tracker.note }}</p>
                </div>
              </button>
            }
          </div>
        </section>
      </div>
    </div>
  `,
  styles: `
    .btn { min-width: 0; }
  `,
})
export class MapComponent implements AfterViewInit, OnDestroy {
  activeOverlay: OverlayKey = 'radar';
  overlayKeys: OverlayKey[] = ['radar', 'warnings', 'reports', 'wind'];
  selectedTrackerName: string | null = 'Portland';
  private map?: L.Map;
  private readonly overlays = new Map<OverlayKey, L.LayerGroup>();
  private readonly markers = new Map<string, L.CircleMarker>();

  overlayLabels: Record<OverlayKey, { label: string; icon: string; description: string }> = {
    radar: {
      label: 'Radar',
      icon: '📡',
      description: 'Animated reflectivity and storm-core pulse scanning over the Maine coastline and inland corridors.',
    },
    warnings: {
      label: 'Warnings',
      icon: '⚠️',
      description: 'A watch and warning layer that highlights advisory boundaries, severe wind pockets, and coastal lull zones.',
    },
    reports: {
      label: 'Storm Reports',
      icon: '📝',
      description: 'Surface observations, hail and wind reports, and local impact notes from the mapped network.',
    },
    wind: {
      label: 'Wind',
      icon: '🌬️',
      description: 'Directional and speed diagnostics for Gulf of Maine gusts, coastal surge transitions, and inland flow shifts.',
    },
  };

  trackers: Tracker[] = [
    {
      name: 'Portland',
      region: 'South Coast',
      status: 'Tracking',
      wind: '18-24 mph',
      note: 'Tighter pressure gradient and marine wind interaction forming near the harbor approach.',
      coordinates: [43.6591, -70.2568],
      overlay: 'radar',
    },
    {
      name: 'Augusta',
      region: 'Kennebec Valley',
      status: 'Watch',
      wind: '14-20 mph',
      note: 'Inland convergence line moving through late-morning with light rain bands and gust fronts.',
      coordinates: [44.3106, -69.7795],
      overlay: 'warnings',
    },
    {
      name: 'Bangor',
      region: 'Penobscot Bay',
      status: 'Tracking',
      wind: '21-28 mph',
      note: 'Fast echo motion pushing east with a clearing line in the upper atmosphere.',
      coordinates: [44.8016, -68.7778],
      overlay: 'radar',
    },
    {
      name: 'Presque Isle',
      region: 'Northern Maine',
      status: 'Monitor',
      wind: '11-16 mph',
      note: 'A calmer cold-air pocket remains stable, with lower storm potential than coastal sectors.',
      coordinates: [46.6817, -68.0089],
      overlay: 'reports',
    },
    {
      name: 'Mount Desert Island',
      region: 'Downeast',
      status: 'Alert',
      wind: '24-31 mph',
      note: 'Strong coastal shear and exposed ridges increase gustiness near the islands and harbor edge.',
      coordinates: [44.3386, -68.2733],
      overlay: 'warnings',
    },
    {
      name: 'Fryeburg',
      region: 'Western Maine',
      status: 'Watch',
      wind: '12-18 mph',
      note: 'Shadowed valley flow moving with an upper-level passing trough and broad moisture feed.',
      coordinates: [44.0112, -70.959],
      overlay: 'wind',
    },
  ];

  ngAfterViewInit(): void {
    this.map = L.map('maine-map', {
      center: [45.25, -68.8],
      zoom: 7,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    const today = new Date().toISOString().split('T')[0];

    // Base Maps
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    });

    const satelliteLayer = L.tileLayer(`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${today}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg`, {
      maxZoom: 9,
      attribution: 'NASA GIBS',
    });

    // Default to street view for better contrast with radar overlay
    streetLayer.addTo(this.map);

    // NOAA NEXRAD Radar overlay (Iowa State Mesonet)
    const radarLayer = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi', {
      layers: 'nexrad-n0r-900913',
      format: 'image/png',
      transparent: true,
      attribution: 'NOAA NEXRAD via Iowa State Mesonet',
      opacity: 0.6,
    } as any);

    // NWS Weather Warnings overlay
    const warningsLayer = L.tileLayer.wms('https://mapservices.weather.noaa.gov/eventdriven/services/WWA/watch_warn_adv/MapServer/WMSServer', {
      layers: '0,1',
      format: 'image/png',
      transparent: true,
      attribution: 'NOAA NWS',
      opacity: 0.5,
    } as any);

    L.control.layers(
      {
        "Street Map": streetLayer,
        "Satellite (NASA)": satelliteLayer,
      },
      {
        "🌧️ NEXRAD Radar": radarLayer,
        "⚠️ NWS Warnings": warningsLayer,
      }
    ).addTo(this.map);

    // Add radar by default
    radarLayer.addTo(this.map);

    // Camera location markers
    const camIcon = L.divIcon({
      html: '<span style="font-size:20px;">📷</span>',
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const camLocations = [
      { name: 'FKOC Stadium Cam', coords: [47.234, -68.5895] as [number, number] },
      { name: 'Dickey Bridge (MaineDOT)', coords: [47.21, -68.85] as [number, number] },
      { name: 'Route 11 Soucy Hill', coords: [46.12, -68.14] as [number, number] },
      { name: 'Island Falls (Rt 11)', coords: [46.01, -68.26] as [number, number] },
      { name: 'Smyrna (Rt 2)', coords: [46.13, -68.00] as [number, number] },
    ];

    for (const cam of camLocations) {
      L.marker(cam.coords, { icon: camIcon })
        .bindPopup(`<strong>${cam.name}</strong><br><a href="/live" style="color:#00e5ff;">Open Live Feed →</a>`)
        .addTo(this.map);
    }

    this.buildLayers();
    this.applyOverlay(this.activeOverlay);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  setOverlay(key: OverlayKey): void {
    this.activeOverlay = key;
    this.applyOverlay(key);
  }

  selectTracker(trackerName: string): void {
    this.selectedTrackerName = trackerName;
    const tracker = this.trackers.find((item) => item.name === trackerName);
    const marker = tracker ? this.markers.get(trackerName) : undefined;

    if (!tracker || !marker || !this.map) {
      return;
    }

    this.map.flyTo(tracker.coordinates, 8, { duration: 0.8 });
    marker.openPopup();
  }

  private buildLayers(): void {
    const keyOrder: OverlayKey[] = ['radar', 'warnings', 'reports', 'wind'];
    const styles: Record<OverlayKey, { color: string; fillColor: string; radius: number }> = {
      radar: { color: '#38bdf8', fillColor: '#38bdf8', radius: 8 },
      warnings: { color: '#f97316', fillColor: '#fb923c', radius: 9 },
      reports: { color: '#a855f7', fillColor: '#c084fc', radius: 7 },
      wind: { color: '#10b981', fillColor: '#34d399', radius: 7 },
    };

    for (const key of keyOrder) {
      const layer = L.layerGroup();
      for (const tracker of this.trackers.filter((item) => item.overlay === key)) {
        const marker = L.circleMarker(tracker.coordinates, {
          radius: styles[key].radius,
          color: styles[key].color,
          fillColor: styles[key].fillColor,
          fillOpacity: 0.9,
          weight: 2,
        });

        marker.bindPopup(`
          <div style="min-width: 180px;">
            <strong>${tracker.name}</strong><br />
            <span>${tracker.region}</span><br />
            <span>${tracker.status}</span><br />
            <small>${tracker.wind}</small><br />
            <small>${tracker.note}</small>
          </div>
        `);

        this.markers.set(tracker.name, marker);
        marker.addTo(layer);
      }

      this.overlays.set(key, layer);
    }
  }

  private applyOverlay(key: OverlayKey): void {
    if (!this.map) {
      return;
    }

    for (const overlay of this.overlays.keys()) {
      const group = this.overlays.get(overlay);
      if (!group) {
        continue;
      }

      if (this.map.hasLayer(group)) {
        this.map.removeLayer(group);
      }
    }

    const selected = this.overlays.get(key);
    if (selected) {
      selected.addTo(this.map);
      this.map.fitBounds(this.getBoundsForActiveOverlay(key), { padding: [24, 24] });
    }
  }

  private getBoundsForActiveOverlay(key: OverlayKey): L.LatLngBounds {
    const points = this.trackers
      .filter((tracker) => tracker.overlay === key)
      .map((tracker) => tracker.coordinates);

    if (points.length === 0) {
      return L.latLngBounds([43.0, -71.0], [46.9, -66.8]);
    }

    return L.latLngBounds(points);
  }
}