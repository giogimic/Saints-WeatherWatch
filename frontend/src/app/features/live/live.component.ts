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
        <div class="text-center mb-10 relative">
          <!-- Fun diagonal stripes decoration -->
          <div class="absolute inset-0 opacity-[0.05] pointer-events-none -z-10" style="background: repeating-linear-gradient(45deg, transparent, transparent 15px, #fff 15px, #fff 30px);"></div>
          
          <div class="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-3xl bg-base-100 border-4 border-base-300 shadow-[6px_6px_0_0_rgba(69,44,99,1)] -rotate-3 hover:rotate-3 transition-transform">
            <span class="text-6xl drop-shadow-md">📹</span>
          </div>
          <h1 class="text-5xl md:text-6xl font-black text-white mb-4 italic uppercase tracking-wider font-sans drop-shadow-[3px_3px_0_rgba(69,44,99,1)]">Chaser Live</h1>
          <p class="text-base-content/80 max-w-3xl mx-auto text-sm md:text-lg font-bold bg-base-200/50 p-4 rounded-2xl border-2 border-base-300 inline-block mb-2">
            Watch storm chasers, road cams, and coastal weather cameras from the Maine and New England corridor.
          </p>
          <div class="mt-4 mx-auto w-fit flex items-center gap-2 rounded-xl bg-accent/20 px-4 py-2 text-xs uppercase font-black text-accent border-2 border-accent/50 shadow-sm">
            <span>⚡ Open one feed at a time to keep the page smooth and lightweight.</span>
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