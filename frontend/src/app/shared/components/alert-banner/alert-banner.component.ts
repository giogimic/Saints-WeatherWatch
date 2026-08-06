import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OpsStateService } from '../../../core/ops-state.service';

@Component({
  selector: 'app-alert-banner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (ops.staleSummary(); as stale) {
      <div
        class="sticky top-0 md:top-[4.5rem] z-[54] border-b px-3 py-1.5 bg-amber-950/90 text-amber-100 border-amber-700/50"
        role="status"
        aria-live="polite"
      >
        <div class="max-w-6xl mx-auto flex items-center gap-2 text-[11px] font-bold">
          <span class="uppercase tracking-[0.18em] text-amber-200/90 shrink-0">Stale</span>
          <span class="truncate opacity-90">
            Cached {{ stale }} may be outdated — showing last-good data. Check source timestamps on Map / Live.
          </span>
          @if (!ops.wsConnected()) {
            <span class="opacity-70 shrink-0">· reconnecting…</span>
          }
        </div>
      </div>
    }
    @if (ops.bannerAlert(); as a) {
      <div
        class="sticky top-0 md:top-[4.5rem] z-[55] border-b-2 px-3 py-2.5"
        [ngClass]="bannerClass(a.severity)"
        role="status"
        aria-live="assertive"
      >
        <div class="max-w-6xl mx-auto flex items-start gap-3">
          <div class="min-w-0 flex-1">
            <p class="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
              New {{ a.severity || 'weather' }} warning
              @if (!ops.wsConnected()) {
                <span class="opacity-60"> · reconnecting…</span>
              }
            </p>
            <p class="font-black text-sm md:text-base leading-snug truncate">{{ a.headline }}</p>
            <p class="text-xs font-semibold opacity-80 truncate">{{ a.area }}</p>
          </div>
          <a
            routerLink="/alerts"
            class="btn btn-sm rounded-xl font-black uppercase shrink-0 min-h-10 border-0 bg-black/20 hover:bg-black/30"
            (click)="ops.dismissBanner()"
          >
            View
          </a>
          <button
            type="button"
            class="btn btn-sm btn-ghost rounded-xl font-black uppercase shrink-0 min-h-10"
            (click)="ops.dismissBanner()"
            aria-label="Dismiss warning banner"
          >
            ✕
          </button>
        </div>
      </div>
    }
  `,
})
export class AlertBannerComponent {
  readonly ops = inject(OpsStateService);

  bannerClass(severity: string): string {
    const s = (severity || '').toLowerCase();
    if (s === 'extreme') return 'bg-error text-error-content border-error-content/30';
    if (s === 'severe') return 'bg-warning text-warning-content border-warning-content/30';
    return 'bg-primary text-primary-content border-primary-content/20';
  }
}
