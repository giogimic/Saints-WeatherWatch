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

  openCameraId: string | null = 'portland-harbor';

  cameras: CameraFeed[] = [
    {
      id: 'portland-harbor',
      title: 'Portland Harbor Cam',
      region: 'South Coast',
      status: 'LIVE',
      description: 'Harbor visibility and coastal pass-through conditions for the Portland corridor.',
      embedUrl: 'https://www.youtube.com/embed/ScMzIvxBSi4?si=zE3qM1FXAI5s3mks',
      sourceUrl: 'https://www.youtube.com/results?search_query=portland+harbor+weather+cam',
      safeEmbedUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/ScMzIvxBSi4?si=zE3qM1FXAI5s3mks'),
    },
    {
      id: 'bangor-coast',
      title: 'Bangor Coastal Feed',
      region: 'Penobscot Bay',
      status: 'LIVE',
      description: 'Coastal motion, cloud deck behavior, and movement across the interstate corridor.',
      embedUrl: 'https://www.youtube.com/embed/aqz-KE-bpKQ?si=I_zccqMHE9j4H2IH',
      sourceUrl: 'https://www.youtube.com/results?search_query=bangor+weather+cam',
      safeEmbedUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/aqz-KE-bpKQ?si=I_zccqMHE9j4H2IH'),
    },
    {
      id: 'downeast-ridge',
      title: 'Downeast Ridge Feed',
      region: 'Mount Desert',
      status: 'LIVE',
      description: 'A high-exposure ridge view with rapid cloud changes and marine wind buildup.',
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?si=AGj2xVdr2Exr1Kgc',
      sourceUrl: 'https://www.youtube.com/results?search_query=downeast+storm+cam',
      safeEmbedUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/dQw4w9WgXcQ?si=AGj2xVdr2Exr1Kgc'),
    },
    {
      id: 'maine-roadwatch',
      title: 'Maine Roadwatch',
      region: 'Statewide',
      status: 'UP NEXT',
      description: 'Road conditions and surface visibility updates for storm-sensitive highway runs.',
      embedUrl: 'https://www.youtube.com/embed/ysz5S6PUM-U?si=fd_8JdF2g5ejl7mE',
      sourceUrl: 'https://www.youtube.com/results?search_query=maine+road+camera',
      safeEmbedUrl: this.sanitizer.bypassSecurityTrustResourceUrl('https://www.youtube.com/embed/ysz5S6PUM-U?si=fd_8JdF2g5ejl7mE'),
    },
  ];

  toggleCamera(cameraId: string): void {
    this.openCameraId = this.openCameraId === cameraId ? null : cameraId;
  }

  isOpen(cameraId: string): boolean {
    return this.openCameraId === cameraId;
  }
}