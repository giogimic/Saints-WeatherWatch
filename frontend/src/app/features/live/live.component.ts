import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface CameraFeed {
  id: string;
  title: string;
  region: string;
  description: string;
  status: string;
  type: 'iframe' | 'image';
  sourceUrl: string;
  attribution: string;
  group: 'cams' | 'satellite' | 'radar';

  embedUrl?: string;
  safeEmbedUrl?: SafeResourceUrl;
  imageUrl?: string;
}

@Component({
  selector: 'app-live',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-[calc(100vh-4rem)] p-4 md:p-6">
      <div class="max-w-6xl mx-auto">

        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-4xl md:text-5xl font-black text-white italic uppercase tracking-wider font-sans drop-shadow-[3px_3px_0_rgba(69,44,99,1)]">
            📹 Chaser Live
          </h1>
          <p class="text-base-content/60 text-sm font-bold uppercase tracking-widest mt-2">
            Real-time webcams &amp; satellite feeds • Proxied through our server
          </p>
          <div class="mt-3 mx-auto w-fit flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-1.5 text-[10px] uppercase font-black text-accent border border-accent/30">
            ⚡ Images refresh automatically. Click to open a feed.
          </div>
        </div>

        <!-- Section: Road & Field Cams -->
        <div class="mb-8">
          <h2 class="text-lg font-black uppercase italic text-primary font-sans tracking-wider mb-4 border-b-2 border-base-300 pb-2 flex items-center gap-2">
            <span class="text-xl">🛣️</span> Road & Field Cams
          </h2>
          <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            @for (camera of getCamsByGroup('cams'); track camera.id) {
              <article class="bg-base-100 border-2 border-base-300 rounded-2xl shadow-[4px_4px_0_0_rgba(69,44,99,1)] p-4 relative overflow-hidden hover:-translate-y-1 transition-transform">
                <div class="flex items-center gap-3 mb-3">
                  <span class="badge text-[10px] font-black uppercase border px-2 py-2 rounded-lg" [ngClass]="camera.status === 'LIVE' ? 'bg-error/20 text-error border-error/50 animate-pulse' : 'bg-warning/20 text-warning border-warning/50'">
                    {{ camera.status }}
                  </span>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-black font-sans text-white text-sm uppercase italic truncate">{{ camera.title }}</h3>
                    <p class="text-[10px] text-base-content/50 font-bold truncate">{{ camera.region }} · {{ camera.attribution }}</p>
                  </div>
                  <button class="btn btn-xs btn-ghost border border-base-300 rounded-lg font-black uppercase text-[10px]" (click)="toggleCamera(camera.id)">
                    {{ isOpen(camera.id) ? 'Hide' : 'View' }}
                  </button>
                </div>
                <p class="text-[11px] text-base-content/60 font-semibold italic mb-2">{{ camera.description }}</p>

                @if (isOpen(camera.id)) {
                  <div class="mt-3 overflow-hidden rounded-xl border-2 border-base-300 bg-base-300/40 shadow-inner relative">
                    @if (camera.type === 'iframe' && camera.safeEmbedUrl) {
                      <iframe class="aspect-video w-full" [src]="camera.safeEmbedUrl" title="{{ camera.title }}" frameborder="0" loading="lazy" allow="autoplay; fullscreen" allowfullscreen></iframe>
                    } @else {
                      <img class="aspect-video w-full object-cover" [src]="camera.imageUrl + '?t=' + currentTimestamp" alt="{{ camera.title }}" loading="lazy" />
                    }
                    <div class="absolute bottom-1.5 right-1.5 bg-black/70 px-2 py-1 rounded-lg text-[9px] text-white font-bold uppercase tracking-wider backdrop-blur-sm pointer-events-none">
                      {{ camera.attribution }}
                    </div>
                  </div>
                }
              </article>
            }
          </div>
        </div>

        <!-- Section: NOAA Satellite -->
        <div class="mb-8">
          <h2 class="text-lg font-black uppercase italic text-secondary font-sans tracking-wider mb-4 border-b-2 border-base-300 pb-2 flex items-center gap-2">
            <span class="text-xl">🛰️</span> NOAA Satellite
          </h2>
          <div class="grid gap-3 md:grid-cols-2">
            @for (camera of getCamsByGroup('satellite'); track camera.id) {
              <article class="bg-base-100 border-2 border-base-300 rounded-2xl shadow-[4px_4px_0_0_rgba(69,44,99,1)] p-4 relative overflow-hidden hover:-translate-y-1 transition-transform">
                <div class="flex items-center gap-3 mb-3">
                  <span class="badge text-[10px] font-black uppercase border px-2 py-2 rounded-lg bg-success/20 text-success border-success/50 animate-pulse">LIVE</span>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-black font-sans text-white text-sm uppercase italic truncate">{{ camera.title }}</h3>
                    <p class="text-[10px] text-base-content/50 font-bold truncate">{{ camera.description }}</p>
                  </div>
                  <button class="btn btn-xs btn-ghost border border-base-300 rounded-lg font-black uppercase text-[10px]" (click)="toggleCamera(camera.id)">
                    {{ isOpen(camera.id) ? 'Hide' : 'View' }}
                  </button>
                </div>
                @if (isOpen(camera.id)) {
                  <div class="mt-2 overflow-hidden rounded-xl border-2 border-base-300 bg-base-300/40 shadow-inner relative">
                    <img class="w-full object-contain" [src]="camera.imageUrl + '?t=' + currentTimestamp" alt="{{ camera.title }}" loading="lazy" />
                    <div class="absolute bottom-1.5 right-1.5 bg-black/70 px-2 py-1 rounded-lg text-[9px] text-white font-bold uppercase tracking-wider backdrop-blur-sm">
                      {{ camera.attribution }}
                    </div>
                  </div>
                }
              </article>
            }
          </div>
        </div>

        <!-- Section: NOAA Radar -->
        <div class="mb-8">
          <h2 class="text-lg font-black uppercase italic text-accent font-sans tracking-wider mb-4 border-b-2 border-base-300 pb-2 flex items-center gap-2">
            <span class="text-xl">📡</span> NOAA Radar
          </h2>
          <div class="grid gap-3 md:grid-cols-2">
            @for (camera of getCamsByGroup('radar'); track camera.id) {
              <article class="bg-base-100 border-2 border-base-300 rounded-2xl shadow-[4px_4px_0_0_rgba(69,44,99,1)] p-4 relative overflow-hidden hover:-translate-y-1 transition-transform">
                <div class="flex items-center gap-3 mb-3">
                  <span class="badge text-[10px] font-black uppercase border px-2 py-2 rounded-lg bg-accent/20 text-accent border-accent/50 animate-pulse">LIVE</span>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-black font-sans text-white text-sm uppercase italic truncate">{{ camera.title }}</h3>
                    <p class="text-[10px] text-base-content/50 font-bold truncate">{{ camera.description }}</p>
                  </div>
                  <button class="btn btn-xs btn-ghost border border-base-300 rounded-lg font-black uppercase text-[10px]" (click)="toggleCamera(camera.id)">
                    {{ isOpen(camera.id) ? 'Hide' : 'View' }}
                  </button>
                </div>
                @if (isOpen(camera.id)) {
                  <div class="mt-2 overflow-hidden rounded-xl border-2 border-base-300 bg-base-300/40 shadow-inner relative">
                    @if (camera.type === 'iframe' && camera.safeEmbedUrl) {
                      <iframe class="aspect-video w-full" [src]="camera.safeEmbedUrl" title="{{ camera.title }}" frameborder="0" loading="lazy" allowfullscreen></iframe>
                    } @else {
                      <img class="w-full object-contain" [src]="camera.imageUrl + '?t=' + currentTimestamp" alt="{{ camera.title }}" loading="lazy" />
                    }
                    <div class="absolute bottom-1.5 right-1.5 bg-black/70 px-2 py-1 rounded-lg text-[9px] text-white font-bold uppercase tracking-wider backdrop-blur-sm">
                      {{ camera.attribution }}
                    </div>
                  </div>
                }
              </article>
            }
          </div>
        </div>

      </div>
    </div>
  `,
  styles: ``
})
export class LiveComponent implements OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);
  private refreshTimer: ReturnType<typeof setInterval>;

  openCameraIds = new Set<string>();
  currentTimestamp: number = Date.now();

  constructor() {
    this.refreshTimer = setInterval(() => {
      this.currentTimestamp = Date.now();
    }, 60000);
  }

  ngOnDestroy(): void {
    clearInterval(this.refreshTimer);
  }

  cameras: CameraFeed[] = [
    // === Live Video Streams (YouTube) ===
    {
      id: 'portland-head-light',
      title: 'Portland Head Light',
      region: 'Cape Elizabeth',
      status: 'LIVE',
      description: 'Live view of Maine\\'s most iconic lighthouse and the entrance to Portland Harbor.',
      type: 'iframe',
      group: 'cams',
      embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UC4g3pL34z6Z6p16kP014Nwg&autoplay=1&mute=1',
      sourceUrl: 'https://www.youtube.com/',
      attribution: '© Portland Head Light',
      safeEmbedUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/live_stream?channel=UC4g3pL34z6Z6p16kP014Nwg&autoplay=1&mute=1'),
    },
    {
      id: 'kennebunkport-live',
      title: 'Kennebunkport Harbor',
      region: 'Kennebunkport',
      status: 'LIVE',
      description: 'Live streaming view of the Nonantum Resort and Kennebunk River.',
      type: 'iframe',
      group: 'cams',
      embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCLmQ25P4Uq7xQ_nF9J_3LzA&autoplay=1&mute=1',
      sourceUrl: 'https://www.youtube.com/',
      attribution: '© Nonantum Resort',
      safeEmbedUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/live_stream?channel=UCLmQ25P4Uq7xQ_nF9J_3LzA&autoplay=1&mute=1'),
    },
    {
      id: 'bar-harbor-cam',
      title: 'Bar Harbor Pier',
      region: 'Mount Desert Island',
      status: 'LIVE',
      description: 'Live view of the harbor and Frenchman Bay from the Bar Harbor pier.',
      type: 'iframe',
      group: 'cams',
      embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCcK7n_f-eOa7Qj2oP-r5v_w&autoplay=1&mute=1',
      sourceUrl: 'https://www.youtube.com/',
      attribution: '© Bar Harbor',
      safeEmbedUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/live_stream?channel=UCcK7n_f-eOa7Qj2oP-r5v_w&autoplay=1&mute=1'),
    },

    // === Regional Webcam Aggregators (Windy) ===
    {
      id: 'windy-cams-north',
      title: 'Northern Maine Cams',
      region: 'Aroostook County',
      status: 'LIVE',
      description: 'Interactive map of all live webcams in Northern Maine and the NB border.',
      type: 'iframe',
      group: 'cams',
      embedUrl: 'https://embed.windy.com/embed.html?type=map&location=coordinates&zoom=8&overlay=webcams&lat=46.7&lon=-68.2&marker=false',
      sourceUrl: 'https://www.windy.com/',
      attribution: '© Windy Webcams',
      safeEmbedUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://embed.windy.com/embed.html?type=map&location=coordinates&zoom=8&overlay=webcams&lat=46.7&lon=-68.2&marker=false'),
    },

    // === NOAA Satellite ===
    {
      id: 'goes-east',
      title: 'GOES-East GeoColor',
      region: 'Northeast US',
      status: 'LIVE',
      description: 'True-color satellite imagery. Updates every ~5 minutes.',
      type: 'image',
      group: 'satellite',
      imageUrl: '/api/cams/goes-east',
      sourceUrl: 'https://www.star.nesdis.noaa.gov/GOES/',
      attribution: '© NOAA GOES-East',
    },
    {
      id: 'goes-east-ir',
      title: 'GOES-East Infrared',
      region: 'Northeast US',
      status: 'LIVE',
      description: 'Infrared band (Band 13) shows cloud-top temps and storm intensity.',
      type: 'image',
      group: 'satellite',
      imageUrl: '/api/cams/goes-east-ir',
      sourceUrl: 'https://www.star.nesdis.noaa.gov/GOES/',
      attribution: '© NOAA GOES-East',
    },

    // === NOAA Radar ===
    {
      id: 'noaa-radar-ne',
      title: 'NE Radar Mosaic',
      region: 'Northeast US',
      status: 'LIVE',
      description: 'NOAA RIDGE composite radar for the Northeast. Updates every ~3 minutes.',
      type: 'image',
      group: 'radar',
      imageUrl: '/api/cams/noaa-radar-ne',
      sourceUrl: 'https://radar.weather.gov/',
      attribution: '© NOAA NWS',
    },
    {
      id: 'radar-windy',
      title: 'Windy.com Radar',
      region: 'Interactive',
      status: 'LIVE',
      description: 'Interactive wind and rain radar. Pan and zoom the embedded map.',
      type: 'iframe',
      group: 'radar',
      embedUrl: 'https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=6&overlay=rain&product=radar&level=surface&lat=45.5&lon=-68.5&detailLat=45.5&detailLon=-68.5&marker=true',
      sourceUrl: 'https://www.windy.com/',
      attribution: '© Windy.com',
      safeEmbedUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=6&overlay=rain&product=radar&level=surface&lat=45.5&lon=-68.5&detailLat=45.5&detailLon=-68.5&marker=true'),
    },
  ];

  getCamsByGroup(group: string): CameraFeed[] {
    return this.cameras.filter(c => c.group === group);
  }

  toggleCamera(cameraId: string): void {
    if (this.openCameraIds.has(cameraId)) {
      this.openCameraIds.delete(cameraId);
    } else {
      this.openCameraIds.add(cameraId);
    }
  }

  isOpen(cameraId: string): boolean {
    return this.openCameraIds.has(cameraId);
  }
}