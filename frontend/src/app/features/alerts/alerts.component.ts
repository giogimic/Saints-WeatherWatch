import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { switchMap, timer } from 'rxjs';

import { WeatherService } from '../../core/weather.service';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-[calc(100vh-4rem)] p-6 storm-bg">
      <div class="max-w-5xl mx-auto">
        <div class="mb-10 text-center relative">
          <!-- Fun diagonal stripes decoration -->
          <div class="absolute inset-0 opacity-[0.05] pointer-events-none -z-10" style="background: repeating-linear-gradient(45deg, transparent, transparent 15px, #fff 15px, #fff 30px);"></div>
          
          <div class="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-3xl bg-base-100 border-4 border-base-300 shadow-[6px_6px_0_0_rgba(69,44,99,1)] rotate-3 hover:-rotate-3 transition-transform">
            <svg viewBox="0 0 120 120" class="h-16 w-16 text-accent drop-shadow-md" fill="none" stroke="currentColor" stroke-width="4">
              <path d="M58 18l-10 24h10l-6 42 24-30H56l1-36z" fill="currentColor" opacity="0.16" />
              <path d="M58 18l-10 24h10l-6 42 24-30H56l1-36z" stroke="currentColor" />
              <path d="M39 60l-8 6M76 48l-7 7M52 79l-5 5" stroke="currentColor" opacity="0.75" />
            </svg>
          </div>
          <h1 class="text-5xl md:text-6xl font-black text-white mb-4 italic uppercase tracking-wider font-sans drop-shadow-[3px_3px_0_rgba(69,44,99,1)]">Storm Alerts</h1>
          <p class="text-base-content/80 mb-6 max-w-3xl mx-auto text-sm md:text-lg font-bold bg-base-200/50 p-4 rounded-2xl border-2 border-base-300 inline-block">
            Watch this feed like a quick storm dashboard. If it says “warning,” it means the weather is acting up right now.
          </p>
        </div>

        <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] mb-8">
          <article class="bg-base-100 border-4 border-base-300 rounded-[2rem] shadow-[6px_6px_0_0_rgba(69,44,99,1)] p-6">
            <div class="mb-4 flex items-center gap-4 border-b-4 border-base-300 pb-4">
              <div class="rounded-2xl bg-accent/20 border-2 border-accent p-3 text-accent shadow-sm rotate-[-5deg]">
                <svg viewBox="0 0 64 64" class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="4">
                  <path d="M14 44h36" stroke="currentColor" opacity="0.4" />
                  <path d="M18 34l8-8 8 8 10-10 8 8" stroke="currentColor" />
                  <path d="M17 52h30" stroke="currentColor" opacity="0.3" />
                </svg>
              </div>
              <h2 class="text-2xl font-black text-accent uppercase italic font-sans tracking-wide">Fast rules</h2>
            </div>
            <ul class="list-disc pl-5 text-base font-semibold text-base-content/80 space-y-3 marker:text-accent">
              <li><strong class="text-white bg-accent/20 px-2 py-0.5 rounded-md">Watch</strong> means conditions are possible.</li>
              <li><strong class="text-white bg-error/20 px-2 py-0.5 rounded-md text-error">Warning</strong> means the storm is already being felt or expected very soon.</li>
              <li>Use the live cams to spot what the sky is doing before you head out.</li>
            </ul>
          </article>

          <article class="bg-base-100 border-4 border-base-300 rounded-[2rem] shadow-[6px_6px_0_0_rgba(69,44,99,1)] p-6">
            <div class="mb-4 flex items-center gap-4 border-b-4 border-base-300 pb-4">
              <div class="rounded-2xl bg-primary/20 border-2 border-primary p-3 text-primary shadow-sm rotate-[5deg]">
                <svg viewBox="0 0 64 64" class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="4">
                  <rect x="10" y="18" width="44" height="28" rx="6" stroke="currentColor" opacity="0.6" />
                  <path d="M20 28h24M20 36h16" stroke="currentColor" />
                </svg>
              </div>
              <h2 class="text-2xl font-black text-primary uppercase italic font-sans tracking-wide">Field Cams</h2>
            </div>
            <div class="flex flex-wrap gap-3 mt-4">
              <a class="btn btn-primary border-4 border-base-300 shadow-[4px_4px_0_0_rgba(69,44,99,1)] hover:-translate-y-1 transition-all rounded-xl font-black uppercase" href="https://www.youtube.com/results?search_query=portland+harbor+weather+cam" target="_blank" rel="noreferrer">Portland</a>
              <a class="btn btn-secondary border-4 border-base-300 shadow-[4px_4px_0_0_rgba(69,44,99,1)] hover:-translate-y-1 transition-all rounded-xl font-black uppercase" href="https://www.youtube.com/results?search_query=bangor+weather+cam" target="_blank" rel="noreferrer">Bangor</a>
              <a class="btn btn-accent border-4 border-base-300 shadow-[4px_4px_0_0_rgba(69,44,99,1)] hover:-translate-y-1 transition-all rounded-xl font-black uppercase" href="https://www.youtube.com/results?search_query=downeast+storm+cam" target="_blank" rel="noreferrer">Downeast</a>
            </div>
          </article>
        </div>

        <div class="grid gap-4 lg:grid-cols-2 mb-6">
          <article class="storm-card">
            <div class="card-body">
              <h2 class="card-title text-secondary">How to read the zones</h2>
              <p class="text-sm text-base-content/70 mt-2">
                The location index is a plain-English way of saying where the storm is strongest right now.
                Zone A is the area closest to the main storm core, while Zone D usually means the wider edge or exposed corridor.
              </p>
              <ul class="list-disc pl-5 text-sm text-base-content/70 mt-3 space-y-2">
                <li><strong>Zone A / Core</strong> means the storm is right near that place and the danger is highest there.</li>
                <li><strong>Zone B / Corridor</strong> means the storm is moving across a main travel path or line of motion.</li>
                <li><strong>Zone C / Drainage</strong> means low spots or flood-prone roads are the real risk area.</li>
                <li><strong>Zone D / Exposed</strong> means open roads, ridges, or coastal areas are getting the strongest gusts.</li>
              </ul>
            </div>
          </article>

          <article class="storm-card">
            <div class="card-body">
              <h2 class="card-title text-primary">Storm terms explained</h2>
              <div class="grid gap-2 mt-3 text-sm text-base-content/70">
                <div class="rounded-xl bg-base-300/30 p-3"><strong>Radar</strong> = the weather map that shows where rain, hail, and rotation are happening.</div>
                <div class="rounded-xl bg-base-300/30 p-3"><strong>Rotation</strong> = the air is spinning, which is a big clue for tornado potential.</div>
                <div class="rounded-xl bg-base-300/30 p-3"><strong>Outflow</strong> = cool air spreading out from a storm and pushing strong wind ahead of it.</div>
                <div class="rounded-xl bg-base-300/30 p-3"><strong>Pressure gradient</strong> = a fast change in air pressure that can make wind stronger.</div>
              </div>
            </div>
          </article>
        </div>

        @if (alerts$ | async; as response) {
          @if (response?.alerts?.length) {
            <article class="storm-card mb-6">
              <div class="card-body">
                <div class="flex items-center justify-between mb-3">
                  <h2 class="card-title text-secondary">Storm history heat chart</h2>
                  <div class="badge badge-outline badge-secondary">last 6 hrs</div>
                </div>
                <div class="grid grid-cols-6 gap-2 mb-4">
                  @for (slot of historySlots; track slot.label) {
                    <div class="rounded-xl border border-base-300 p-2 text-center">
                      <div class="h-20 rounded-lg {{ heatLevel(slot.value) }} flex items-end justify-center pb-2 text-xs font-semibold text-slate-950">
                        {{ slot.value }}
                      </div>
                      <div class="mt-2 text-[11px] uppercase tracking-[0.2em] text-base-content/50">{{ slot.label }}</div>
                    </div>
                  }
                </div>

                <div class="grid gap-3 md:grid-cols-2">
                  @for (entry of response.history; track entry.id) {
                    <div class="rounded-2xl border border-base-300 bg-base-300/25 p-3">
                      <div class="flex items-center justify-between gap-2">
                        <div class="badge badge-outline badge-secondary">{{ entry.category }}</div>
                        <div class="text-[11px] uppercase tracking-[0.22em] text-base-content/50">{{ entry.count }} hits</div>
                      </div>
                      <h3 class="mt-2 font-semibold text-primary">{{ entry.headline }}</h3>
                      <p class="mt-1 text-sm text-base-content/70">{{ entry.whatItMeans }}</p>
                      <p class="mt-2 text-xs text-base-content/60">Location index: {{ entry.locationIndex }}</p>
                    </div>
                  }
                </div>
              </div>
            </article>

            <div class="grid gap-6 md:grid-cols-2">
              @for (alert of response.alerts; track alert.id) {
                <article class="bg-base-100 border-4 border-base-300 rounded-[2rem] shadow-[8px_8px_0_0_rgba(69,44,99,1)] p-6 relative overflow-hidden group hover:-translate-y-2 transition-transform">
                  <!-- Highlight bar -->
                  <div class="absolute left-0 top-0 bottom-0 w-4" [ngClass]="getSeverityColorClass(alert.severity)"></div>
                  
                  <div class="pl-4">
                    <div class="flex flex-wrap items-start justify-between gap-3 mb-4 border-b-4 border-base-300 pb-4">
                      <div>
                        <div class="badge font-black uppercase border-2 shadow-sm mb-3 px-3 py-4 text-xs rounded-xl" [ngClass]="getSeverityBgClass(alert.severity)">
                          {{ alert.severity }}
                        </div>
                        <h2 class="text-2xl font-black font-sans text-white leading-tight uppercase italic drop-shadow-sm">{{ alert.headline }}</h2>
                        <p class="text-sm text-base-content/70 font-bold mt-1">📍 {{ alert.area }}</p>
                      </div>
                      <div class="text-right text-sm font-bold bg-base-200 p-3 rounded-2xl border-2 border-base-300 flex flex-col gap-1 shadow-inner">
                        <div class="text-xs uppercase tracking-widest text-base-content/50">Status</div>
                        <div class="text-primary">{{ statusLabel(alert.status) }}</div>
                        <div class="text-error animate-pulse mt-1">{{ countdown(alert.endsAt) }}</div>
                      </div>
                    </div>

                    <div class="mt-4 rounded-2xl bg-base-200/50 p-4 border-2 border-base-300 border-dashed">
                      <div class="mb-2 font-black text-secondary uppercase tracking-wider text-xs">Why this alert exists</div>
                      <p class="text-sm font-semibold italic text-base-content/80">{{ alert.why }}</p>
                    </div>

                    <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm font-bold">
                      <div class="rounded-xl bg-base-200 border-2 border-base-300 px-4 py-3">
                        <div class="text-[10px] uppercase tracking-widest text-base-content/50 mb-1">Category</div>
                        <div class="text-primary">{{ alert.category }}</div>
                      </div>
                      <div class="rounded-xl bg-base-200 border-2 border-base-300 px-4 py-3">
                        <div class="text-[10px] uppercase tracking-widest text-base-content/50 mb-1">Location index</div>
                        <div class="text-accent">{{ alert.locationIndex }}</div>
                      </div>
                      <div class="rounded-xl bg-base-200 border-2 border-base-300 px-4 py-3 sm:col-span-2">
                        <div class="text-[10px] uppercase tracking-widest text-base-content/50 mb-1">Cause</div>
                        <div class="text-base-content">{{ alert.cause }}</div>
                      </div>
                      <div class="rounded-xl bg-error/10 border-2 border-error px-4 py-3 sm:col-span-2">
                        <div class="text-[10px] uppercase tracking-widest text-error mb-1">What to do</div>
                        <div class="text-white">{{ alert.whatToDo }}</div>
                      </div>
                    </div>
                  </div>
                </article>
              }
            </div>
          } @else {
            <div class="alert alert-info shadow-lg">
              <span>Storm data is loading. Refresh in a moment if the feed is still blank.</span>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: ``
})
export class AlertsComponent {
  private readonly weatherService = inject(WeatherService);

  alerts$ = timer(0, 60000).pipe(switchMap(() => this.weatherService.getAlerts()));

  historySlots = [
    { label: 'Now', value: 4 },
    { label: '-1h', value: 2 },
    { label: '-2h', value: 5 },
    { label: '-3h', value: 3 },
    { label: '-4h', value: 1 },
    { label: '-5h', value: 4 },
  ];

  getSeverityColorClass(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'extreme': return 'bg-error';
      case 'severe': return 'bg-accent';
      case 'moderate': return 'bg-warning';
      default: return 'bg-primary';
    }
  }

  getSeverityBgClass(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'extreme': return 'bg-error/20 text-error border-error/50';
      case 'severe': return 'bg-accent/20 text-accent border-accent/50';
      case 'moderate': return 'bg-warning/20 text-warning border-warning/50';
      default: return 'bg-primary/20 text-primary border-primary/50';
    }
  }

  statusLabel(status: string): string {
    return status.toUpperCase();
  }

  formatTimestamp(value: string): string {
    return new Date(value).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  countdown(value: string): string {
    const distance = new Date(value).getTime() - Date.now();
    const minutes = Math.max(0, Math.round(distance / 60000));
    return `${minutes} min remaining`;
  }

  heatLevel(value: number): string {
    if (value >= 4) {
      return 'bg-rose-400';
    }
    if (value >= 3) {
      return 'bg-amber-300';
    }
    if (value >= 2) {
      return 'bg-sky-300';
    }
    return 'bg-slate-200';
  }
}