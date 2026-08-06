import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { OpsStateService } from '../../core/ops-state.service';

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
  lat?: number;
  lng?: number;
  km?: number;
  category?: string;
  health?: string;
  lastUpdated?: string;
  ageSec?: number;
  blackFrame?: boolean;
  corridorId?: string;
  corridorLabel?: string;
  nearAlertIds?: string[];
  nearAlertCount?: number;
}

@Component({
  selector: 'app-live',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-[calc(100vh-4rem)] p-4 md:p-6">
      <div class="max-w-6xl mx-auto">

        <div class="mb-6 md:mb-8">
          <h1 class="text-3xl md:text-4xl font-black text-white italic uppercase tracking-wider font-sans">
            Chaser Live
          </h1>
          <p class="text-base-content/60 text-sm font-semibold mt-1">
            Northern Maine / St. John Valley · health · corridors · closest first
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              class="btn btn-sm btn-ghost border border-base-300 rounded-xl font-bold uppercase text-[10px] min-h-11"
              (click)="openNearest()"
              [disabled]="!getCamsByGroup('cams').length"
            >
              Open nearest
            </button>
            <button
              type="button"
              class="btn btn-sm btn-ghost border border-base-300 rounded-xl font-bold uppercase text-[10px] min-h-11"
              (click)="collapseAll()"
              [disabled]="!hasOpen()"
            >
              Collapse all
            </button>
          </div>
          @if (nearWarningCams.length) {
            <div class="mt-4 storm-card p-3 border-warning/40">
              <div class="text-[10px] font-black uppercase tracking-widest text-warning mb-2">
                Cams near active warnings · {{ nearWarningCams.length }}
              </div>
              <div class="flex flex-wrap gap-1.5">
                @for (cam of nearWarningCams; track cam.id) {
                  <button
                    type="button"
                    class="btn btn-xs rounded-lg font-black uppercase tracking-wider min-h-9"
                    [ngClass]="isOpen(cam.id) ? 'btn-warning' : 'btn-ghost border border-warning/40'"
                    (click)="openCam(cam)"
                  >{{ cam.title }} · {{ cam.nearAlertCount || 1 }}</button>
                }
              </div>
            </div>
          }
        </div>

        @if (loading) {
          <div class="text-center py-16 text-base-content/50 font-bold uppercase tracking-widest">Loading camera feeds…</div>
        } @else if (loadError) {
          <div class="storm-card p-6 text-center mb-8 border-error/40">
            <p class="font-black text-error uppercase">Could not load camera list</p>
            <p class="text-sm text-base-content/60 mt-2">{{ loadError }}</p>
          </div>
        }

        @for (section of sections; track section.group) {
          <div class="mb-8">
            <h2 class="text-sm font-black uppercase tracking-widest text-base-content/70 mb-3 flex items-center gap-2 border-b border-base-300 pb-2">
              <span>{{ section.icon }}</span> {{ section.title }}
              <span class="ml-auto text-[10px] font-bold text-base-content/40 normal-case tracking-normal">
                {{ getCamsByGroup(section.group).length }} feeds
              </span>
            </h2>

            @if (section.group === 'cams') {
              @for (bucket of camCorridorSections; track bucket.id) {
                <div class="mb-4">
                  <h3 class="text-[11px] font-black uppercase tracking-widest text-sky-300/90 mb-2">
                    {{ bucket.label }}
                    <span class="text-base-content/40 font-bold normal-case tracking-normal">· {{ bucket.cams.length }}</span>
                  </h3>
                  <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3 items-start">
                    @for (camera of bucket.cams; track camera.id) {
                      <ng-container *ngTemplateOutlet="camCard; context: { $implicit: camera, grp: 'cams' }"></ng-container>
                    }
                  </div>
                </div>
              }
              @if (!loading && getCamsByGroup('cams').length === 0) {
                <div class="text-center py-8 text-base-content/50 font-bold">No road cams cached yet — try again in a minute.</div>
              }
            } @else {
              <div class="grid gap-3 md:grid-cols-2 items-start">
                @for (camera of getCamsByGroup(section.group); track camera.id) {
                  <ng-container *ngTemplateOutlet="camCard; context: { $implicit: camera, grp: section.group }"></ng-container>
                }
              </div>
            }

            @if (section.group === 'radar') {
              <article class="storm-card overflow-hidden mt-3">
                <button
                  type="button"
                  class="w-full text-left p-4 min-h-14 flex items-center gap-3 hover:bg-white/5 transition-colors"
                  (click)="toggleCamera('radar-windy', 'radar')"
                  [attr.aria-expanded]="isOpen('radar-windy')"
                >
                  <span class="badge text-[10px] font-black uppercase border px-2 py-2 rounded-lg bg-accent/20 text-accent border-accent/50">LIVE</span>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-black font-sans text-white text-sm uppercase italic truncate">Windy.com Radar</h3>
                    <p class="text-[10px] text-base-content/50 font-bold truncate">Interactive wind and rain radar</p>
                  </div>
                  <span class="text-base-content/40 text-xs shrink-0 transition-transform" [class.rotate-180]="isOpen('radar-windy')">▼</span>
                </button>
                <div class="feed-panel" [class.feed-panel-open]="isOpen('radar-windy')">
                  <div class="feed-panel-inner">
                    <div class="px-4 pb-4">
                      @if (isOpen('radar-windy')) {
                        <div class="overflow-hidden rounded-xl border border-base-300 bg-base-300/40 relative">
                          <iframe class="aspect-video w-full" [src]="windySafeUrl" title="Windy Radar" frameborder="0" loading="lazy" allowfullscreen></iframe>
                          <div class="absolute bottom-1.5 right-1.5 bg-black/70 px-2 py-1 rounded-lg text-[9px] text-white font-bold uppercase tracking-wider backdrop-blur-sm">© Windy.com</div>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </article>
            }
          </div>
        }

        <ng-template #camCard let-camera let-grp="grp">
          <article
            class="storm-card overflow-hidden self-start"
            [ngClass]="(camera.nearAlertCount || 0) > 0 ? 'ring-1 ring-warning/50' : ''"
          >            <button
              type="button"
              class="w-full text-left p-4 min-h-14 flex items-center gap-3 hover:bg-white/5 transition-colors"
              (click)="toggleCamera(camera.id, grp)"
              [attr.aria-expanded]="isOpen(camera.id)"
            >
              <span
                class="badge text-[10px] font-black uppercase border px-2 py-2 rounded-lg shrink-0"
                [ngClass]="healthClass(camera)"
              >{{ healthLabel(camera) }}</span>
              <div class="flex-1 min-w-0">
                <h3 class="font-black font-sans text-white text-sm uppercase italic truncate">{{ camera.title }}</h3>
                <p class="text-[10px] text-base-content/50 font-bold truncate">
                  {{ camera.corridorLabel || camera.region }} · {{ ageLabel(camera) }} · {{ camera.attribution }}
                </p>
              </div>
              <span class="text-base-content/40 text-xs shrink-0 transition-transform" [class.rotate-180]="isOpen(camera.id)">▼</span>
            </button>

            <div class="feed-panel" [class.feed-panel-open]="isOpen(camera.id)">
              <div class="feed-panel-inner">
                <div class="px-4 pb-4">
                  <p class="text-[11px] text-base-content/55 font-semibold mb-3">{{ camera.description }}</p>
                  <div class="relative overflow-hidden rounded-xl border border-base-300 bg-base-300/40 min-h-[180px]">
                    @if (isOpen(camera.id)) {
                      @if (failedIds[camera.id]) {
                        <div class="aspect-video flex items-center justify-center text-sm font-bold text-base-content/50">
                          Feed offline
                        </div>
                      } @else if (camera.type === 'iframe' && camera.safeEmbedUrl) {
                        <iframe
                          class="aspect-video w-full"
                          [src]="camera.safeEmbedUrl"
                          [title]="camera.title"
                          frameborder="0"
                          loading="lazy"
                          allow="autoplay; fullscreen"
                          allowfullscreen
                        ></iframe>
                      } @else {
                        @if (!loadedIds[camera.id]) {
                          <div class="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-widest font-bold text-base-content/40 animate-pulse">
                            Loading feed…
                          </div>
                        }
                        <img
                          class="aspect-video w-full object-cover"
                          [class.opacity-0]="!loadedIds[camera.id]"
                          [class.opacity-100]="loadedIds[camera.id]"
                          [src]="feedSrc(camera)"
                          [alt]="camera.title"
                          loading="lazy"
                          (load)="onFeedLoad(camera.id)"
                          (error)="onFeedError(camera.id)"
                        />
                      }
                      <div class="absolute bottom-1.5 right-1.5 bg-black/70 px-2 py-1 rounded-lg text-[9px] text-white font-bold uppercase tracking-wider backdrop-blur-sm pointer-events-none">
                        {{ camera.attribution }}
                      </div>
                    }
                  </div>
                  <div class="mt-3 flex flex-wrap gap-2">
                    @if (camera.lat && camera.lng) {
                      <a
                        class="btn btn-xs btn-ghost border border-base-300 rounded-lg font-black uppercase text-[10px] min-h-10"
                        [routerLink]="['/map']"
                        [queryParams]="{ cam: camera.id }"
                        (click)="$event.stopPropagation()"
                      >
                        Show on map
                      </a>
                    }
                    @if (camera.group === 'cams') {
                      <button
                        type="button"
                        class="btn btn-xs rounded-lg font-black uppercase text-[10px] min-h-10"
                        [ngClass]="isFavorite(camera.id) ? 'btn-secondary' : 'btn-ghost border border-base-300'"
                        (click)="toggleFavorite(camera.id); $event.stopPropagation()"
                      >
                        {{ isFavorite(camera.id) ? '★ Favorited' : '☆ Favorite' }}
                      </button>
                    }
                  </div>
                </div>
              </div>
            </div>
          </article>
        </ng-template>

      </div>
    </div>
  `,
  styles: `
    .feed-panel {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 220ms ease;
    }
    .feed-panel-open {
      grid-template-rows: 1fr;
    }
    .feed-panel-inner {
      overflow: hidden;
      min-height: 0;
    }
  `
})
export class LiveComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly ops = inject(OpsStateService);
  private refreshTimer: ReturnType<typeof setInterval> | undefined;
  private listTimer: ReturnType<typeof setInterval> | undefined;

  /** Accordion: one open id per group. New object each toggle for CD. */
  openByGroup: Record<string, string | null> = {
    cams: null,
    satellite: null,
    radar: null,
  };
  currentTimestamp = Date.now();
  cameras: CameraFeed[] = [];
  loading = true;
  loadError = '';
  loadedIds: Record<string, boolean> = {};
  failedIds: Record<string, boolean> = {};

  sections = [
    { group: 'cams' as const, title: 'Road & Field Cams', icon: '🛣️' },
    { group: 'satellite' as const, title: 'NOAA Satellite', icon: '🛰️' },
    { group: 'radar' as const, title: 'NOAA Radar', icon: '📡' },
  ];

  windySafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    'https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=7&overlay=rain&product=radar&level=surface&lat=47.05&lon=-68.35&detailLat=47.05&detailLon=-68.35&marker=true'
  );

  ngOnInit(): void {
    this.loadCameras();
    this.refreshTimer = setInterval(() => {
      this.currentTimestamp = Date.now();
    }, 60000);
    this.listTimer = setInterval(() => this.loadCameras(), 2 * 60 * 1000);

    this.route.queryParamMap.subscribe(params => {
      const cam = params.get('cam');
      if (cam) {
        this.openRequestedCam(cam);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.listTimer) clearInterval(this.listTimer);
  }

  get nearWarningCams(): CameraFeed[] {
    return this.getCamsByGroup('cams')
      .filter(c => (c.nearAlertCount || 0) > 0)
      .sort((a, b) => (b.nearAlertCount || 0) - (a.nearAlertCount || 0));
  }

  get camCorridorSections(): { id: string; label: string; cams: CameraFeed[] }[] {
    const order = [
      'st-john',
      'caribou',
      'i95-north',
      'nb-border',
      'outer',
      '',
    ];
    const buckets = new Map<string, { id: string; label: string; cams: CameraFeed[] }>();
    for (const cam of this.getCamsByGroup('cams')) {
      const id = cam.corridorId || 'outer';
      const label = cam.corridorLabel || 'Outer corridor';
      if (!buckets.has(id)) {
        buckets.set(id, { id, label, cams: [] });
      }
      buckets.get(id)!.cams.push(cam);
    }
    const out: { id: string; label: string; cams: CameraFeed[] }[] = [];
    for (const id of order) {
      const b = buckets.get(id);
      if (b?.cams.length) out.push(b);
      buckets.delete(id);
    }
    for (const b of buckets.values()) {
      if (b.cams.length) out.push(b);
    }
    return out;
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
        const requested = this.route.snapshot.queryParamMap.get('cam');
        if (requested) {
          this.openRequestedCam(requested);
        }
      }
    });
  }

  getCamsByGroup(group: string): CameraFeed[] {
    return this.cameras.filter(c => c.group === group);
  }

  toggleCamera(cameraId: string, group: string): void {
    const next = this.openByGroup[group] === cameraId ? null : cameraId;
    this.openByGroup = { ...this.openByGroup, [group]: next };
    if (next) {
      this.failedIds = { ...this.failedIds, [cameraId]: false };
      this.loadedIds = { ...this.loadedIds, [cameraId]: false };
    }
  }

  openCam(cam: CameraFeed): void {
    this.openByGroup = { ...this.openByGroup, [cam.group]: cam.id };
    this.failedIds = { ...this.failedIds, [cam.id]: false };
    this.loadedIds = { ...this.loadedIds, [cam.id]: false };
  }

  isOpen(cameraId: string): boolean {
    return Object.values(this.openByGroup).includes(cameraId);
  }

  hasOpen(): boolean {
    return Object.values(this.openByGroup).some(Boolean);
  }

  openNearest(): void {
    const nearest = this.getCamsByGroup('cams')[0];
    if (!nearest) return;
    this.openCam(nearest);
  }

  collapseAll(): void {
    this.openByGroup = { cams: null, satellite: null, radar: null };
  }

  feedSrc(camera: CameraFeed): string {
    if (!camera.imageUrl) return '';
    return `${camera.imageUrl}?t=${this.currentTimestamp}`;
  }

  onFeedLoad(id: string): void {
    this.loadedIds = { ...this.loadedIds, [id]: true };
  }

  onFeedError(id: string): void {
    this.failedIds = { ...this.failedIds, [id]: true };
    this.loadedIds = { ...this.loadedIds, [id]: true };
  }

  healthLabel(camera: CameraFeed): string {
    const h = (camera.health || '').toLowerCase();
    if (h === 'ok') return 'OK';
    if (h === 'stale') return 'STALE';
    if (h === 'black') return 'BLACK';
    if (h === 'error') return 'ERROR';
    if (h === 'pending') return 'PENDING';
    return camera.status || '—';
  }

  healthClass(camera: CameraFeed): string {
    const h = (camera.health || '').toLowerCase();
    switch (h) {
      case 'ok':
        return 'bg-success/20 text-success border-success/50';
      case 'stale':
        return 'bg-warning/20 text-warning border-warning/50';
      case 'black':
      case 'error':
        return 'bg-error/20 text-error border-error/50';
      case 'pending':
        return 'bg-base-content/10 text-base-content/60 border-base-300';
      default:
        return camera.status === 'LIVE'
          ? 'bg-error/20 text-error border-error/50'
          : 'bg-warning/20 text-warning border-warning/50';
    }
  }

  ageLabel(camera: CameraFeed): string {
    if (camera.ageSec == null || camera.ageSec <= 0) {
      return camera.health === 'pending' ? 'no frame' : 'age —';
    }
    if (camera.ageSec < 90) return `${camera.ageSec}s`;
    return `${Math.round(camera.ageSec / 60)}m`;
  }

  isFavorite(id: string): boolean {
    return this.ops.favoriteCamIds().includes(id);
  }

  toggleFavorite(id: string): void {
    if (!this.auth.isLoggedIn()) {
      this.auth.openModal('login');
      return;
    }
    this.ops.toggleFavorite(id);
  }

  private openRequestedCam(camId: string): void {
    const cam = this.cameras.find(c => c.id === camId);
    if (!cam) return;
    this.openCam(cam);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { cam: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
