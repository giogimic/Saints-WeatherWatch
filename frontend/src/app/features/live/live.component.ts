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

  // For iframe feeds
  embedUrl?: string;
  safeEmbedUrl?: SafeResourceUrl;

  // For image feeds (proxied through /api/cams/{id})
  imageUrl?: string;
  refreshIntervalMs?: number;
}

@Component({
  selector: 'app-live',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-[calc(100vh-4rem)] p-6">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-10 relative">
          <!-- Fun diagonal stripes decoration -->
          <div class="absolute inset-0 opacity-[0.05] pointer-events-none -z-10" style="background: repeating-linear-gradient(45deg, transparent, transparent 15px, #fff 15px, #fff 30px);"></div>
          
          <div class="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-3xl bg-base-100 border-4 border-base-300 shadow-[6px_6px_0_0_rgba(69,44,99,1)] -rotate-3 hover:rotate-3 transition-transform">
            <span class="text-6xl drop-shadow-md">📹</span>
          </div>
          <h1 class="text-5xl md:text-6xl font-black text-white mb-4 italic uppercase tracking-wider font-sans drop-shadow-[3px_3px_0_rgba(69,44,99,1)]">Chaser Live</h1>
          <p class="text-base-content/80 max-w-3xl mx-auto text-sm md:text-lg font-bold bg-base-200/50 p-4 rounded-2xl border-2 border-base-300 inline-block mb-2">
            Real-time webcams, road cams, and NOAA satellite imagery — proxied through our server for lightning-fast loads.
          </p>
          <div class="mt-4 mx-auto w-fit flex items-center gap-2 rounded-xl bg-accent/20 px-4 py-2 text-xs uppercase font-black text-accent border-2 border-accent/50 shadow-sm">
            <span>⚡ Images refresh automatically every 60 seconds. Open one feed at a time for best performance.</span>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          @for (camera of cameras; track camera.id) {
            <article class="bg-base-100 border-4 border-base-300 rounded-[2rem] shadow-[8px_8px_0_0_rgba(69,44,99,1)] p-5 relative overflow-hidden group hover:-translate-y-2 transition-transform">
              <div class="flex items-start justify-between gap-3 mb-4">
                <div class="badge font-black uppercase border-2 shadow-sm px-3 py-3 rounded-xl" [ngClass]="camera.status === 'LIVE' ? 'bg-error/20 text-error border-error/50 animate-pulse' : 'bg-warning/20 text-warning border-warning/50'">
                  {{ camera.status }}
                </div>
                <div class="text-[10px] font-black uppercase text-secondary bg-secondary/10 px-3 py-1.5 rounded-lg border-2 border-secondary/20">{{ camera.region }}</div>
              </div>

              <h2 class="text-xl font-black font-sans text-white uppercase italic tracking-wide drop-shadow-sm mb-2">{{ camera.title }}</h2>
              <p class="text-sm font-semibold text-base-content/70 italic">{{ camera.description }}</p>

              <div class="mt-5 flex gap-3">
                <button type="button" class="btn btn-secondary border-4 border-base-300 shadow-[4px_4px_0_0_rgba(69,44,99,1)] hover:-translate-y-1 transition-all rounded-xl font-black uppercase flex-1" (click)="toggleCamera(camera.id)">
                  {{ isOpen(camera.id) ? 'Hide feed' : 'Open feed' }}
                </button>
                <a class="btn btn-ghost border-4 border-base-300 shadow-[4px_4px_0_0_rgba(69,44,99,1)] hover:-translate-y-1 transition-all rounded-xl font-black uppercase bg-base-200 text-white" [href]="camera.sourceUrl" target="_blank" rel="noreferrer">
                  Link
                </a>
              </div>

              @if (isOpen(camera.id)) {
                <div class="mt-5 overflow-hidden rounded-[1.5rem] border-4 border-base-300 bg-base-300/40 shadow-inner">
                  @if (camera.type === 'iframe' && camera.safeEmbedUrl) {
                    <iframe
                      class="aspect-video w-full"
                      [src]="camera.safeEmbedUrl"
                      title="{{ camera.title }}"
                      frameborder="0"
                      loading="lazy"
                      referrerpolicy="strict-origin-when-cross-origin"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowfullscreen
                    ></iframe>
                  } @else if (camera.type === 'image' && camera.imageUrl) {
                    <div class="relative">
                      <img 
                        class="aspect-video w-full object-cover" 
                        [src]="camera.imageUrl + '?t=' + currentTimestamp" 
                        alt="{{ camera.title }}" 
                        loading="lazy"
                      />
                      <div class="absolute bottom-2 right-2 bg-black/70 px-3 py-1.5 rounded-xl text-[10px] text-white font-bold uppercase tracking-wider backdrop-blur-sm">
                        {{ camera.attribution }}
                      </div>
                    </div>
                  }
                </div>
              }
            </article>
          }
        </div>
      </div>
    </div>
  `,
  styles: ``
})
export class LiveComponent implements OnDestroy {
  private readonly sanitizer = inject(DomSanitizer);
  private refreshTimer: ReturnType<typeof setInterval>;

  openCameraId: string | null = null;
  currentTimestamp: number = Date.now();

  constructor() {
    // Refresh the timestamp every 60 seconds to bust image cache
    this.refreshTimer = setInterval(() => {
      this.currentTimestamp = Date.now();
    }, 60000);
  }

  ngOnDestroy(): void {
    clearInterval(this.refreshTimer);
  }

  cameras: CameraFeed[] = [
    {
      id: 'fkoc-stadium',
      title: 'FKOC Stadium Cam',
      region: 'Fort Kent',
      status: 'LIVE',
      description: 'Fort Kent Outdoor Center biathlon stadium. Auto-refreshes every 60s via our server proxy.',
      type: 'image',
      imageUrl: '/api/cams/fkoc-stadium',
      sourceUrl: 'https://www.fortkentoc.org/',
      attribution: '© Fort Kent Outdoor Center',
      refreshIntervalMs: 60000
    },
    {
      id: 'mdot-dickey',
      title: 'Dickey Bridge',
      region: 'Allagash',
      status: 'LIVE',
      description: 'MaineDOT highway camera at Dickey Bridge over the St. John River.',
      type: 'image',
      imageUrl: '/api/cams/mdot-dickey',
      sourceUrl: 'https://www.maine.gov/mdot/cams/',
      attribution: '© MaineDOT',
      refreshIntervalMs: 60000
    },
    {
      id: 'mdot-soucy',
      title: 'Route 11 Soucy Hill',
      region: 'Oakfield',
      status: 'LIVE',
      description: 'MaineDOT highway camera on Route 11 near Soucy Hill.',
      type: 'image',
      imageUrl: '/api/cams/mdot-soucy',
      sourceUrl: 'https://www.maine.gov/mdot/cams/',
      attribution: '© MaineDOT',
      refreshIntervalMs: 60000
    },
    {
      id: 'goes-east',
      title: 'NOAA GOES-East',
      region: 'Northeast US',
      status: 'LIVE',
      description: 'Real-time GeoColor satellite imagery of the Northeast sector. Updates every ~5 minutes.',
      type: 'image',
      imageUrl: '/api/cams/goes-east',
      sourceUrl: 'https://www.star.nesdis.noaa.gov/GOES/',
      attribution: '© NOAA / GOES-East',
      refreshIntervalMs: 300000
    },
    {
      id: 'maine-roadwatch',
      title: 'Maine Roadwatch',
      region: 'Statewide',
      status: 'UP NEXT',
      description: 'Road conditions and surface visibility updates for storm-sensitive highway runs.',
      type: 'iframe',
      embedUrl: 'https://www.youtube.com/embed/SH63YaIWyK0?autoplay=1&mute=1',
      sourceUrl: 'https://www.youtube.com/results?search_query=maine+road+camera',
      attribution: '© YouTube',
      safeEmbedUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/SH63YaIWyK0?autoplay=1&mute=1'),
    },
  ];

  toggleCamera(cameraId: string): void {
    this.openCameraId = this.openCameraId === cameraId ? null : cameraId;
  }

  isOpen(cameraId: string): boolean {
    return this.openCameraId === cameraId;
  }
}