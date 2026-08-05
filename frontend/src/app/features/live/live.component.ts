import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface CameraFeed {
  id: string;
  title: string;
  region: string;
  description: string;
  status: string;
  embedUrl: string;
  sourceUrl: string;
  safeEmbedUrl: SafeResourceUrl;
}

@Component({
  selector: 'app-live',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-[calc(100vh-4rem)] p-6">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-8">
          <span class="text-6xl mb-4 block">📹</span>
          <h1 class="text-4xl font-bold text-secondary mb-3">Chaser Live</h1>
          <p class="text-base-content/60 max-w-3xl mx-auto">
            Watch storm chasers, road cams, and coastal weather cameras from the Maine and New England corridor.
          </p>
          <div class="mt-4 inline-flex items-center gap-2 rounded-full bg-base-300/50 px-4 py-2 text-xs uppercase tracking-[0.25em] text-base-content/60">
            Open one feed at a time to keep the page smooth and lightweight.
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          @for (camera of cameras; track camera.id) {
            <article class="card bg-base-200/70 border border-base-300 shadow-lg">
              <div class="card-body">
                <div class="flex items-center justify-between gap-3">
                  <div class="badge {{ camera.status === 'LIVE' ? 'badge-error' : 'badge-warning' }} badge-outline">
                    {{ camera.status }}
                  </div>
                  <div class="text-xs uppercase tracking-[0.2em] text-base-content/50">{{ camera.region }}</div>
                </div>

                <h2 class="card-title mt-2">{{ camera.title }}</h2>
                <p class="text-sm text-base-content/60">{{ camera.description }}</p>

                <div class="mt-3 flex gap-2">
                  <button type="button" class="btn btn-sm btn-secondary" (click)="toggleCamera(camera.id)">
                    {{ isOpen(camera.id) ? 'Hide feed' : 'Open feed' }}
                  </button>
                  <a class="btn btn-sm btn-ghost" [href]="camera.sourceUrl" target="_blank" rel="noreferrer">
                    Source link
                  </a>
                </div>

                @if (isOpen(camera.id)) {
                  <div class="mt-4 overflow-hidden rounded-xl border border-base-300 bg-base-300/40">
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
                  </div>
                }
              </div>
            </article>
          }
        </div>
      </div>
    </div>
  `,
  styles: ``
})
export class LiveComponent {
  private readonly sanitizer = inject(DomSanitizer);

  openCameraId: string | null = null;

  cameras: CameraFeed[] = [
    {
      id: 'portland-harbor',
      title: 'Portland Harbor Cam',
      region: 'South Coast',
      status: 'LIVE',
      description: 'Harbor visibility and coastal pass-through conditions for the Portland corridor.',
      embedUrl: 'https://www.youtube.com/embed/x_ruIH2UmjQ?autoplay=1&mute=1',
      sourceUrl: 'https://www.youtube.com/results?search_query=portland+harbor+weather+cam',
      safeEmbedUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/x_ruIH2UmjQ?autoplay=1&mute=1'),
    },
    {
      id: 'bangor-coast',
      title: 'Bangor Coastal Feed',
      region: 'Penobscot Bay',
      status: 'LIVE',
      description: 'Coastal motion, cloud deck behavior, and movement across the interstate corridor.',
      embedUrl: 'https://www.youtube.com/embed/17b2pL34z0s?autoplay=1&mute=1',
      sourceUrl: 'https://www.youtube.com/results?search_query=bangor+weather+cam',
      safeEmbedUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/17b2pL34z0s?autoplay=1&mute=1'),
    },
    {
      id: 'downeast-ridge',
      title: 'Downeast Ridge Feed',
      region: 'Mount Desert',
      status: 'LIVE',
      description: 'A high-exposure ridge view with rapid cloud changes and marine wind buildup.',
      embedUrl: 'https://www.youtube.com/embed/z2XQPOmeSCU?autoplay=1&mute=1',
      sourceUrl: 'https://www.youtube.com/results?search_query=downeast+storm+cam',
      safeEmbedUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/z2XQPOmeSCU?autoplay=1&mute=1'),
    },
    {
      id: 'maine-roadwatch',
      title: 'Maine Roadwatch',
      region: 'Statewide',
      status: 'UP NEXT',
      description: 'Road conditions and surface visibility updates for storm-sensitive highway runs.',
      embedUrl: 'https://www.youtube.com/embed/SH63YaIWyK0?autoplay=1&mute=1',
      sourceUrl: 'https://www.youtube.com/results?search_query=maine+road+camera',
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