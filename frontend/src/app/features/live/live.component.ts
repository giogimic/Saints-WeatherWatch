import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';

export interface CameraFeed {
  id: string;
  title: string;
  region: string;
  description: string;
  status: string;
  type: 'iframe' | 'image';
  group: 'cams' | 'satellite' | 'radar';
  imageUrl?: string;
  embedUrl?: string;
  safeEmbedUrl?: SafeResourceUrl;
  attribution: string;
  sourceUrl?: string;
  km?: number;
  category?: string;
}

@Component({
  selector: 'app-live',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-[calc(100vh-4rem)] p-4 md:p-6">
      <div class="max-w-6xl mx-auto">

        <div class="text-center mb-8">
          <h1 class="text-4xl md:text-5xl font-black text-white italic uppercase tracking-wider font-sans drop-shadow-[3px_3px_0_rgba(69,44,99,1)]">
            📹 Chaser Live
          </h1>
          <p class="text-base-content/60 text-sm font-bold uppercase tracking-widest mt-2">
            Northern Maine / St. John Valley corridor · closest feeds first
          </p>
          <div class="mt-3 mx-auto w-fit flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-1.5 text-[10px] uppercase font-black text-accent border border-accent/30">
            ⚡ Proxied through our server · auto-refreshes · sourced via public DOT / FAA / USGS feeds
          </div>
        </div>

        @if (loading) {
          <div class="text-center py-16 text-base-content/50 font-bold uppercase tracking-widest">Loading camera feeds…</div>
        } @else if (loadError) {
          <div class="bg-error/10 border-2 border-error/40 rounded-2xl p-6 text-center mb-8">
            <p class="font-black text-error uppercase">Could not load camera list</p>
            <p class="text-sm text-base-content/60 mt-2">{{ loadError }}</p>
          </div>
        }

        <div class="mb-8">
          <h2 class="text-lg font-black uppercase italic text-primary font-sans tracking-wider mb-4 border-b-2 border-base-300 pb-2 flex items-center gap-2">
            <span class="text-xl">🛣️</span> Road & Field Cams
            <span class="text-[10px] font-bold text-base-content/40 normal-case tracking-normal ml-auto">{{ getCamsByGroup('cams').length }} feeds</span>
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
          @if (!loading && getCamsByGroup('cams').length === 0) {
            <div class="text-center py-8 text-base-content/50 font-bold">No road cams cached yet — try again in a minute.</div>
          }
        </div>

        <div class="mb-8">
          <h2 class="text-lg font-black uppercase italic text-secondary font-sans tracking-wider mb-4 border-b-2 border-base-300 pb-2 flex items-center gap-2">
            <span class="text-xl">🛰️</span> NOAA Satellite
          </h2>
          <div class="grid gap-3 md:grid-cols-2">
            @for (camera of getCamsByGroup('satellite'); track camera.id) {
              <article class="bg-base-100 border-2 border-base-300 rounded-2xl shadow-[4px_4px_0_0_rgba(69,44,99,1)] p-4 relative overflow-hidden hover:-translate-y-1 transition-transform">
                <div class="flex items-center gap-3 mb-3">
                  <span class="badge text-[10px] font-black uppercase border px-2 py-2 rounded-lg bg-success/20 text-success border-success/50 animate-pulse">{{ camera.status }}</span>
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

        <div class="mb-8">
          <h2 class="text-lg font-black uppercase italic text-accent font-sans tracking-wider mb-4 border-b-2 border-base-300 pb-2 flex items-center gap-2">
            <span class="text-xl">📡</span> NOAA Radar
          </h2>
          <div class="grid gap-3 md:grid-cols-2">
            @for (camera of getCamsByGroup('radar'); track camera.id) {
              <article class="bg-base-100 border-2 border-base-300 rounded-2xl shadow-[4px_4px_0_0_rgba(69,44,99,1)] p-4 relative overflow-hidden hover:-translate-y-1 transition-transform">
                <div class="flex items-center gap-3 mb-3">
                  <span class="badge text-[10px] font-black uppercase border px-2 py-2 rounded-lg bg-accent/20 text-accent border-accent/50 animate-pulse">{{ camera.status }}</span>
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

            <!-- Keep interactive Windy radar as a bonus embed (not proxied) -->
            <article class="bg-base-100 border-2 border-base-300 rounded-2xl shadow-[4px_4px_0_0_rgba(69,44,99,1)] p-4 relative overflow-hidden hover:-translate-y-1 transition-transform">
              <div class="flex items-center gap-3 mb-3">
                <span class="badge text-[10px] font-black uppercase border px-2 py-2 rounded-lg bg-accent/20 text-accent border-accent/50 animate-pulse">LIVE</span>
                <div class="flex-1 min-w-0">
                  <h3 class="font-black font-sans text-white text-sm uppercase italic truncate">Windy.com Radar</h3>
                  <p class="text-[10px] text-base-content/50 font-bold truncate">Interactive wind and rain radar for the corridor</p>
                </div>
                <button class="btn btn-xs btn-ghost border border-base-300 rounded-lg font-black uppercase text-[10px]" (click)="toggleCamera('radar-windy')">
                  {{ isOpen('radar-windy') ? 'Hide' : 'View' }}
                </button>
              </div>
              @if (isOpen('radar-windy')) {
                <div class="mt-2 overflow-hidden rounded-xl border-2 border-base-300 bg-base-300/40 shadow-inner relative">
                  <iframe class="aspect-video w-full" [src]="windySafeUrl" title="Windy Radar" frameborder="0" loading="lazy" allowfullscreen></iframe>
                  <div class="absolute bottom-1.5 right-1.5 bg-black/70 px-2 py-1 rounded-lg text-[9px] text-white font-bold uppercase tracking-wider backdrop-blur-sm">© Windy.com</div>
                </div>
              }
            </article>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: ``
})
export class LiveComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private refreshTimer: ReturnType<typeof setInterval> | undefined;
  private listTimer: ReturnType<typeof setInterval> | undefined;

  openCameraIds = new Set<string>();
  currentTimestamp = Date.now();
  cameras: CameraFeed[] = [];
  loading = true;
  loadError = '';

  windySafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    'https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=7&overlay=rain&product=radar&level=surface&lat=47.05&lon=-68.35&detailLat=47.05&detailLon=-68.35&marker=true'
  );

  ngOnInit(): void {
    this.loadCameras();
    this.refreshTimer = setInterval(() => {
      this.currentTimestamp = Date.now();
    }, 60000);
    this.listTimer = setInterval(() => this.loadCameras(), 5 * 60 * 1000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.listTimer) clearInterval(this.listTimer);
  }

  loadCameras(): void {
    this.http.get<CameraFeed[]>('/api/cams').pipe(
      catchError(err => {
        console.error('cams list error', err);
        this.loadError = 'Backend camera list unavailable.';
        this.loading = false;
        return of([] as CameraFeed[]);
      })
    ).subscribe(list => {
      this.loading = false;
      if (list.length) {
        this.loadError = '';
        this.cameras = list.map(c => ({
          ...c,
          type: c.type || 'image',
          group: c.group || 'cams',
        }));
        // Auto-open the nearest few road cams on first load
        if (this.openCameraIds.size === 0) {
          this.getCamsByGroup('cams').slice(0, 3).forEach(c => this.openCameraIds.add(c.id));
          this.getCamsByGroup('satellite').forEach(c => this.openCameraIds.add(c.id));
        }
      }
    });
  }

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
