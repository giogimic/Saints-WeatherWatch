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
        <div class="mb-6 text-center">
          <div class="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-base-100/70 ring-1 ring-accent/40 shadow-[0_0_35px_rgba(239,68,68,0.25)]">
            <svg viewBox="0 0 120 120" class="h-14 w-14 text-accent" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M58 18l-10 24h10l-6 42 24-30H56l1-36z" fill="currentColor" opacity="0.16" />
              <path d="M58 18l-10 24h10l-6 42 24-30H56l1-36z" stroke="currentColor" />
              <path d="M39 60l-8 6M76 48l-7 7M52 79l-5 5" stroke="currentColor" opacity="0.75" />
            </svg>
          </div>
          <h1 class="text-4xl font-bold text-accent mb-3">Storm Alerts</h1>
          <p class="text-base-content/70 mb-6 max-w-3xl mx-auto text-sm md:text-base">
            Watch this feed like a quick storm dashboard. If it says “warning,” it means the weather is acting up right now.
          </p>
        </div>

        <div class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr] mb-6">
          <article class="storm-card">
            <div class="card-body">
              <div class="mb-3 flex items-center gap-3">
                <div class="rounded-xl bg-accent/15 p-2 text-accent">
                  <svg viewBox="0 0 64 64" class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M14 44h36" stroke="currentColor" opacity="0.4" />
                    <path d="M18 34l8-8 8 8 10-10 8 8" stroke="currentColor" />
                    <path d="M17 52h30" stroke="currentColor" opacity="0.3" />
                  </svg>
                </div>
                <h2 class="card-title text-accent">Fast rules</h2>
              </div>
              <ul class="list-disc pl-5 text-sm text-base-content/70 space-y-2">
                <li><strong>Watch</strong> means conditions are possible.</li>
                <li><strong>Warning</strong> means the storm is already being felt or expected very soon.</li>
                <li>Use the live cams to spot what the sky is doing before you head out.</li>
              </ul>
            </div>
          </article>

          <article class="storm-card">
            <div class="card-body">
              <div class="mb-3 flex items-center gap-3">
                <div class="rounded-xl bg-primary/15 p-2 text-primary">
                  <svg viewBox="0 0 64 64" class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="3">
                    <rect x="10" y="18" width="44" height="28" rx="4" stroke="currentColor" opacity="0.6" />
                    <path d="M20 28h24M20 36h16" stroke="currentColor" />
                  </svg>
                </div>
                <h2 class="card-title text-primary">Field cam links</h2>
              </div>
              <div class="flex flex-wrap gap-2 mt-3">
                <a class="btn btn-sm btn-outline btn-primary" href="https://www.youtube.com/results?search_query=portland+harbor+weather+cam" target="_blank" rel="noreferrer">Portland Harbor</a>
                <a class="btn btn-sm btn-outline btn-secondary" href="https://www.youtube.com/results?search_query=bangor+weather+cam" target="_blank" rel="noreferrer">Bangor Coastal</a>
                <a class="btn btn-sm btn-outline btn-accent" href="https://www.youtube.com/results?search_query=downeast+storm+cam" target="_blank" rel="noreferrer">Downeast Ridge</a>
              </div>
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

            <div class="grid gap-4 md:grid-cols-2">
              @for (alert of response.alerts; track alert.id) {
                <article class="storm-card">
                  <div class="card-body">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <div class="badge {{ severityClass(alert.severity) }} badge-outline mb-2">
                          {{ alert.severity }}
                        </div>
                        <h2 class="card-title text-lg">{{ alert.headline }}</h2>
                        <p class="text-sm text-base-content/60">{{ alert.area }}</p>
                      </div>
                      <div class="text-right text-sm text-base-content/70">
                        <div>{{ statusLabel(alert.status) }}</div>
                        <div>{{ countdown(alert.endsAt) }}</div>
                      </div>
                    </div>

                    <div class="mt-4 rounded-2xl bg-base-300/25 p-3 text-sm text-base-content/70">
                      <div class="mb-1 font-semibold text-secondary">Why this alert exists</div>
                      <p>{{ alert.why }}</p>
                    </div>

                    <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div class="rounded-lg bg-base-300/40 px-3 py-2">
                        <div class="text-base-content/50">Category</div>
                        <div>{{ alert.category }}</div>
                      </div>
                      <div class="rounded-lg bg-base-300/40 px-3 py-2">
                        <div class="text-base-content/50">Location index</div>
                        <div>{{ alert.locationIndex }}</div>
                      </div>
                      <div class="rounded-lg bg-base-300/40 px-3 py-2 sm:col-span-2">
                        <div class="text-base-content/50">Cause</div>
                        <div>{{ alert.cause }}</div>
                      </div>
                      <div class="rounded-lg bg-base-300/40 px-3 py-2 sm:col-span-2">
                        <div class="text-base-content/50">What to do</div>
                        <div>{{ alert.whatToDo }}</div>
                      </div>
                      <div class="rounded-lg bg-base-300/40 px-3 py-2">
                        <div class="text-base-content/50">Starts</div>
                        <div>{{ formatTimestamp(alert.startsAt) }}</div>
                      </div>
                      <div class="rounded-lg bg-base-300/40 px-3 py-2">
                        <div class="text-base-content/50">Ends</div>
                        <div>{{ formatTimestamp(alert.endsAt) }}</div>
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

  severityClass(severity: string): string {
    switch (severity) {
      case 'Extreme':
        return 'badge-error';
      case 'Severe':
        return 'badge-warning';
      case 'Moderate':
        return 'badge-info';
      default:
        return 'badge-success';
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