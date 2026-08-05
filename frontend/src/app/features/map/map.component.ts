import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule],
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

        <!-- SEARCH BAR -->
        <div class="card bg-base-200/70 border border-base-300 shadow-xl p-4 mb-6">
          <h2 class="text-xl font-bold text-primary mb-2">Location Search</h2>
          <div class="flex flex-col sm:flex-row gap-3 items-center">
            <input 
              type="text" 
              placeholder="Search for a city or town..." 
              class="input input-bordered w-full font-bold" 
              [(ngModel)]="searchQuery"
              (keyup.enter)="performSearch()"
            >
            <button class="btn btn-primary font-black uppercase tracking-wider w-full sm:w-auto" (click)="performSearch()" [disabled]="isSearching">
              @if (isSearching) {
                <span class="loading loading-spinner"></span>
              } @else {
                🔍 Search
              }
            </button>
          </div>
          @if (searchError) {
            <p class="text-error font-bold mt-2 text-sm">{{ searchError }}</p>
          }
          
          <!-- Search Results / Nearest Hotspots -->
          @if (searchResult) {
            <div class="mt-4 p-4 bg-base-300/40 rounded-xl border border-base-300">
              <h3 class="text-sm font-black uppercase tracking-widest text-secondary mb-2">📍 Found: {{ searchResult.display_name }}</h3>
              <p class="text-xs font-bold text-base-content/60 mb-3">Nearest monitored hotspots:</p>
              
              <div class="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                @for (loc of nearestLocations; track loc.name) {
                  <button 
                    class="btn btn-sm h-auto py-2 flex flex-col items-start gap-1 justify-start border-2 border-base-300 bg-base-100 hover:border-primary transition-colors text-left"
                    (click)="jumpToCoords(loc.coords, loc.name, loc.type)"
                  >
                    <div class="flex justify-between w-full items-center">
                      <span class="font-bold text-[11px] truncate">{{ loc.name }}</span>
                      <span class="badge badge-sm badge-outline text-[9px]">{{ loc.type }}</span>
                    </div>
                    <span class="text-[10px] text-base-content/60 font-semibold">{{ loc.distance.toFixed(1) }} miles away</span>
                  </button>
                }
              </div>
            </div>
          }
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

            <div id="maine-map" class="mt-4 h-[500px] w-full rounded-2xl overflow-hidden border border-base-300 relative z-0"></div>
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
            
            <div class="mt-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold text-secondary">Tracker Nodes</h2>
                <div class="badge badge-secondary badge-outline text-xs">Coastal / Inland</div>
              </div>

              <div class="mb-4 rounded-xl border border-base-300 bg-base-300/40 p-3 text-sm text-base-content/70">
                <span class="font-semibold text-base-content">Selected tracker:</span>
                {{ selectedTrackerName ?? 'None' }}
              </div>

              <div class="grid gap-3">
                @for (tracker of trackers; track tracker.name) {
                  <button
                    type="button"
                    class="card bg-base-200/70 border-2 border-base-300 shadow-sm text-left transition hover:-translate-y-0.5 hover:border-primary {{ selectedTrackerName === tracker.name ? 'ring-2 ring-primary border-primary' : '' }}"
                    (click)="selectTracker(tracker.name)"
                  >
                    <div class="card-body p-3">
                      <div class="flex items-start justify-between gap-3">
                        <div>
                          <div class="badge badge-outline badge-sm mb-1">{{ tracker.region }}</div>
                          <h3 class="card-title text-base">{{ tracker.name }}</h3>
                        </div>
                        <div class="text-right">
                          <div class="text-xs font-semibold text-success">{{ tracker.status }}</div>
                          <div class="text-[10px] text-base-content/60">{{ tracker.wind }}</div>
                        </div>
                      </div>
                    </div>
                  </button>
                }
              </div>
            </div>
          </section>
        </div>
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
  private readonly markers = new Map<string, L.CircleMarker | L.Marker>();
  private searchMarker?: L.Marker;

  searchQuery = '';
  isSearching = false;
  searchError = '';
  searchResult: { lat: number; lon: number; display_name: string } | null = null;
  nearestLocations: { name: string; distance: number; type: 'Camera' | 'Tracker'; coords: [number, number] }[] = [];

  camLocations = [
    { name: 'FKOC Stadium Cam', coords: [47.234, -68.5895] as [number, number] },
    { name: 'Dickey Bridge (MaineDOT)', coords: [47.21, -68.85] as [number, number] },
    { name: 'Route 11 Soucy Hill', coords: [46.12, -68.14] as [number, number] },
    { name: 'Island Falls (Rt 11)', coords: [46.01, -68.26] as [number, number] },
    { name: 'Smyrna (Rt 2)', coords: [46.13, -68.00] as [number, number] },
  ];

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

    for (const cam of this.camLocations) {
      const marker = L.marker(cam.coords, { icon: camIcon })
        .bindPopup(`<strong>${cam.name}</strong><br><a href="/live" style="color:#00e5ff;">Open Live Feed →</a>`)
        .addTo(this.map);
      this.markers.set(cam.name, marker);
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
    const marker = this.markers.get(trackerName);

    if (!marker || !this.map) {
      return;
    }

    const coords = marker.getLatLng();
    this.map.flyTo(coords, 9, { duration: 0.8 });
    marker.openPopup();
  }

  jumpToCoords(coords: [number, number], name: string, type: 'Camera' | 'Tracker') {
    if (!this.map) return;
    this.map.flyTo(coords, 10, { duration: 1.0 });
    
    // Open the popup if it exists
    const marker = this.markers.get(name);
    if (marker) {
      // Small delay to let the map fly first
      setTimeout(() => {
        marker.openPopup();
      }, 500);
    }
  }

  async performSearch() {
    if (!this.searchQuery.trim()) return;
    
    this.isSearching = true;
    this.searchError = '';
    this.searchResult = null;
    this.nearestLocations = [];

    try {
      // Use OpenStreetMap Nominatim API for geocoding
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchQuery)}&limit=1`);
      const data = await res.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        
        this.searchResult = {
          lat,
          lon,
          display_name: data[0].display_name.split(',').slice(0, 3).join(',')
        };

        this.updateSearchMarker(lat, lon);
        this.findNearestHotspots(lat, lon);
        
        if (this.map) {
          this.map.flyTo([lat, lon], 8, { duration: 1 });
        }
      } else {
        this.searchError = 'Location not found. Try a different search term.';
      }
    } catch (err) {
      this.searchError = 'Error searching location. Please try again.';
      console.error(err);
    } finally {
      this.isSearching = false;
    }
  }

  private updateSearchMarker(lat: number, lon: number) {
    if (!this.map) return;
    
    if (this.searchMarker) {
      this.map.removeLayer(this.searchMarker);
    }

    const searchIcon = L.divIcon({
      html: '<div style="font-size:32px; filter: drop-shadow(0px 4px 4px rgba(0,0,0,0.5)); animation: bounce 1s infinite;">📍</div>',
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    this.searchMarker = L.marker([lat, lon], { icon: searchIcon })
      .bindPopup(`<strong>${this.searchResult?.display_name}</strong>`)
      .addTo(this.map);
    
    setTimeout(() => this.searchMarker?.openPopup(), 1000);
  }

  private findNearestHotspots(lat: number, lon: number) {
    const allLocations: { name: string; type: 'Camera' | 'Tracker'; coords: [number, number] }[] = [
      ...this.trackers.map(t => ({ name: t.name, type: 'Tracker' as const, coords: t.coordinates })),
      ...this.camLocations.map(c => ({ name: c.name, type: 'Camera' as const, coords: c.coords }))
    ];

    const withDistances = allLocations.map(loc => ({
      ...loc,
      distance: this.calculateDistance(lat, lon, loc.coords[0], loc.coords[1])
    }));

    // Sort by distance and take top 6
    this.nearestLocations = withDistances
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 6);
  }

  // Haversine formula for distance in miles
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3958.8; // Radius of the earth in miles
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
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
    }
  }
}