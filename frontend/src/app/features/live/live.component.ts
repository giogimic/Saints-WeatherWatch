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
  streamType?: string; // image | burst | mjpeg | hls
  burstUrls?: string[];
  supportsEmbedding?: boolean;
  authRequired?: boolean;
  weatherTags?: string[];
  failoverCamId?: string;
  failoverCamTitle?: string;
  provinceState?: string;
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
          <p class="text-[10px] text-base-content/45 font-semibold mt-2 max-w-2xl leading-relaxed"
            [title]="ops.policyNote() || 'Official/licensed feeds only'">
            {{ ops.attribution() }}
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
            <button
              type="button"
              class="btn btn-sm rounded-xl font-bold uppercase text-[10px] min-h-11"
              [ngClass]="ops.impactMode() ? 'btn-warning' : 'btn-ghost border border-base-300'"
              (click)="ops.toggleImpactMode()"
            >
              Impact mode
            </button>

            <!-- Group By Selector -->
            <div class="join border border-base-300 rounded-xl overflow-hidden ml-auto">
              <button
                type="button"
                class="btn btn-sm join-item font-bold uppercase text-[10px] min-h-11"
                [ngClass]="groupByMode === 'corridor' ? 'btn-primary' : 'btn-ghost'"
                (click)="groupByMode = 'corridor'"
              >📍 Corridor</button>
              <button
                type="button"
                class="btn btn-sm join-item font-bold uppercase text-[10px] min-h-11"
                [ngClass]="groupByMode === 'type' ? 'btn-primary' : 'btn-ghost'"
                (click)="groupByMode = 'type'"
              >📡 Feed Type</button>
              <button
                type="button"
                class="btn btn-sm join-item font-bold uppercase text-[10px] min-h-11"
                [ngClass]="groupByMode === 'category' ? 'btn-primary' : 'btn-ghost'"
                (click)="groupByMode = 'category'"
              >🏷️ Category</button>
            </div>
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
              @if (groupByMode === 'corridor') {
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
              }

              @if (groupByMode === 'type') {
                @for (bucket of camTypeSections; track bucket.id) {
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
              }

              @if (groupByMode === 'category') {
                @for (bucket of camCategorySections; track bucket.id) {
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

              <!-- Stream Technology Badge -->
              <span
                class="badge text-[9px] font-black uppercase border px-2 py-1 rounded-md shrink-0"
                [ngClass]="streamBadgeClass(camera)"
              >{{ streamBadgeText(camera) }}</span>

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
                        <!-- mjpeg or static image -->
                        @if (!camera.streamType || camera.streamType === 'image' || camera.streamType === 'mjpeg') {
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
                        
                        <!-- hls video -->
                        @if (camera.streamType === 'hls') {
                          <video
                            class="aspect-video w-full object-cover"
                            [src]="camera.sourceUrl || feedSrc(camera)"
                            autoplay
                            muted
                            playsinline
                            controls
                            (loadeddata)="onFeedLoad(camera.id)"
                            (error)="onFeedError(camera.id)"
                          ></video>
                        }

                        <!-- burst loop or gallery view -->
                        @if (camera.streamType === 'burst' && camera.burstUrls?.length) {
                          <div class="relative w-full aspect-video">
                            <img
                              class="w-full h-full object-cover transition-opacity duration-150"
                              [src]="burstSrc(camera)"
                              [alt]="camera.title"
                              (load)="onFeedLoad(camera.id)"
                              (error)="onFeedError(camera.id)"
                            />
                            <!-- scrubber indicator -->
                            <div class="absolute bottom-0 left-0 h-1.5 bg-accent shadow-[0_0_8px_rgba(0,229,255,0.8)] transition-all duration-300" 
                                 [style.width.%]="((burstIndexFor(camera.id) + 1) / camera.burstUrls.length) * 100">
                            </div>
                            <div class="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[9px] font-black text-accent tracking-wider backdrop-blur-sm">
                              FRAME {{ burstIndexFor(camera.id) + 1 }} / {{ camera.burstUrls.length }}
                            </div>
                          </div>

                          <!-- Historical Snapshot Gallery Strip -->
                          @if (galleryMode[camera.id]) {
                            <div class="mt-3 p-2 bg-base-300/40 rounded-xl border border-base-300 space-y-2">
                              <div class="flex items-center justify-between text-[10px] font-black uppercase text-base-content/70">
                                <span>Historical Frame Gallery</span>
                                <span>Tap frame to freeze</span>
                              </div>
                              <div class="flex gap-2 overflow-x-auto pb-1">
                                @for (url of camera.burstUrls; track $index) {
                                  <button
                                    type="button"
                                    class="relative shrink-0 w-20 aspect-video rounded-lg overflow-hidden border-2 transition-all"
                                    [class.border-accent]="burstIndexFor(camera.id) === $index"
                                    [class.border-transparent]="burstIndexFor(camera.id) !== $index"
                                    (click)="setBurstIndex(camera.id, $index)"
                                  >
                                    <img [src]="url" class="w-full h-full object-cover" loading="lazy" />
                                    <span class="absolute bottom-0.5 right-0.5 bg-black/80 px-1 rounded text-[8px] font-bold text-white">#{{ $index + 1 }}</span>
                                  </button>
                                }
                              </div>
                            </div>
                          }
                        }
                      }
                      <div class="absolute bottom-1.5 right-1.5 bg-black/70 px-2 py-1 rounded-lg text-[9px] text-white font-bold uppercase tracking-wider backdrop-blur-sm pointer-events-none">
                        {{ camera.attribution }}
                      </div>
                    }
                  </div>
                  @if (camera.failoverCamTitle && (camera.health === 'error' || camera.health === 'black' || failedIds[camera.id])) {
                    <div class="mt-2 p-2 rounded-lg bg-warning/10 border border-warning/30 text-[10px] font-bold text-warning flex items-center justify-between">
                      <span>⚠️ Primary offline — Nearest working feed: {{ camera.failoverCamTitle }}</span>
                    </div>
                  }
                  <div class="mt-3 flex flex-wrap gap-2">
                    @if (camera.streamType === 'burst' && camera.burstUrls?.length) {
                      <button
                        type="button"
                        class="btn btn-xs rounded-lg font-black uppercase text-[10px] min-h-10"
                        [ngClass]="galleryMode[camera.id] ? 'btn-accent' : 'btn-ghost border border-base-300'"
                        (click)="toggleGalleryMode(camera.id); $event.stopPropagation()"
                      >
                        {{ galleryMode[camera.id] ? '▶ Play Stream' : '🖼️ Frame Gallery' }}
                      </button>
                    }
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
  readonly ops = inject(OpsStateService);
  private refreshTimer: ReturnType<typeof setInterval> | undefined;
  private listTimer: ReturnType<typeof setInterval> | undefined;
  private burstTimer: ReturnType<typeof setInterval> | undefined;

  burstIndices: Record<string, number> = {};
  galleryMode: Record<string, boolean> = {};
  groupByMode: 'corridor' | 'type' | 'category' = 'corridor';

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
    }, 60 * 1000);
    this.listTimer = setInterval(() => this.loadCameras(), 2 * 60 * 1000);
    this.burstTimer = setInterval(() => this.advanceBursts(), 800);

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
      'quebec-border',
      'nb-route2',
      'nova-scotia',
      'pei',
      'newfoundland',
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

  get camTypeSections(): { id: string; label: string; cams: CameraFeed[] }[] {
    const typeMap: Record<string, { label: string; cams: CameraFeed[] }> = {
      hls: { label: '📹 Live HLS Video Streams', cams: [] },
      burst: { label: '🎞️ FAA Burst Image Sequences', cams: [] },
      mjpeg: { label: '🔄 Motion JPEG Live Streams', cams: [] },
      image: { label: '📸 Auto-Refreshing JPEGs', cams: [] },
      iframe: { label: '🌐 Interactive Web Embeds', cams: [] },
    };

    for (const cam of this.getCamsByGroup('cams')) {
      const st = cam.type === 'iframe' ? 'iframe' : (cam.streamType || 'image');
      if (typeMap[st]) {
        typeMap[st].cams.push(cam);
      } else {
        typeMap['image'].cams.push(cam);
      }
    }

    return Object.entries(typeMap)
      .filter(([_, b]) => b.cams.length > 0)
      .map(([id, b]) => ({ id, label: b.label, cams: b.cams }));
  }

  get camCategorySections(): { id: string; label: string; cams: CameraFeed[] }[] {
    const catMap: Record<string, { label: string; cams: CameraFeed[] }> = {
      aviation: { label: '🛫 Airport & Aviation Cams', cams: [] },
      traffic: { label: '🚗 Road & Traffic Cams', cams: [] },
      border: { label: '🌉 Border Crossings & Transit', cams: [] },
      marine: { label: '⛵ Marine & Coastal Cams', cams: [] },
      nature: { label: '🏔️ Nature & Mountain Cams', cams: [] },
    };

    for (const cam of this.getCamsByGroup('cams')) {
      const cat = (cam.category || 'traffic').toLowerCase();
      if (catMap[cat]) {
        catMap[cat].cams.push(cam);
      } else {
        if (!catMap['other']) {
          catMap['other'] = { label: '📷 Regional Cams', cams: [] };
        }
        catMap['other'].cams.push(cam);
      }
    }

    return Object.entries(catMap)
      .filter(([_, b]) => b.cams.length > 0)
      .map(([id, b]) => ({ id, label: b.label, cams: b.cams }));
  }

  streamBadgeText(camera: CameraFeed): string {
    if (camera.type === 'iframe') return '🌐 EMBED';
    switch (camera.streamType) {
      case 'hls': return '📹 HLS';
      case 'burst': return '🎞️ BURST';
      case 'mjpeg': return '🔄 MJPEG';
      default: return '📸 IMAGE';
    }
  }

  streamBadgeClass(camera: CameraFeed): string {
    if (camera.type === 'iframe') return 'bg-neutral/30 text-neutral-content border-neutral/50';
    switch (camera.streamType) {
      case 'hls': return 'bg-accent/20 text-accent border-accent/50';
      case 'burst': return 'bg-primary/20 text-primary border-primary/50';
      case 'mjpeg': return 'bg-info/20 text-info border-info/50';
      default: return 'bg-base-300 text-base-content/70 border-base-300';
    }
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
        this.cameras = list.map(c => {
          const type = c.type === 'iframe' || c.streamType === 'iframe' ? 'iframe' : (c.type || 'image');
          const group = c.group || 'cams';
          const cam = {
            ...c,
            type,
            group,
          };
          if (type === 'iframe' && cam.embedUrl) {
            cam.safeEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(cam.embedUrl);
          }
          return cam;
        });
        const requested = this.route.snapshot.queryParamMap.get('cam');
        if (requested) {
          this.openRequestedCam(requested);
        }
      }
    });
  }

  getCamsByGroup(group: string): CameraFeed[] {
    let list = this.cameras.filter(c => c.group === group);
    if (this.ops.impactMode() && group === 'cams') {
      const focused = list.filter(c =>
        (c.nearAlertCount || 0) > 0 ||
        ['stale', 'black', 'error'].includes((c.health || '').toLowerCase())
      );
      if (focused.length) {
        list = focused.sort((a, b) => (b.nearAlertCount || 0) - (a.nearAlertCount || 0));
      }
    }
    return list;
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
    // mjpeg does not need cache busting typically, but image does
    if (camera.streamType === 'mjpeg') {
      return camera.imageUrl;
    }
    return `${camera.imageUrl}?t=${this.currentTimestamp}`;
  }

  burstIndexFor(camId: string): number {
    return this.burstIndices[camId] || 0;
  }

  setBurstIndex(camId: string, idx: number): void {
    this.burstIndices[camId] = idx;
  }

  toggleGalleryMode(camId: string): void {
    this.galleryMode[camId] = !this.galleryMode[camId];
  }

  burstSrc(camera: CameraFeed): string {
    if (!camera.burstUrls || !camera.burstUrls.length) return '';
    const idx = this.burstIndexFor(camera.id);
    return camera.burstUrls[idx % camera.burstUrls.length];
  }

  private advanceBursts(): void {
    if (!this.cameras) return;
    for (const cam of this.cameras) {
      if (cam.streamType === 'burst' && cam.burstUrls && cam.burstUrls.length > 0 && this.isOpen(cam.id)) {
        const len = cam.burstUrls.length;
        const current = this.burstIndices[cam.id] || 0;
        this.burstIndices[cam.id] = (current + 1) % len;
      }
    }
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
