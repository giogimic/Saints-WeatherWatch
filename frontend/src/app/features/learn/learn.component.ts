import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-learn',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-[calc(100vh-4rem)] p-6 storm-bg">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-8">
          <div class="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-base-100/70 ring-1 ring-primary/40 shadow-[0_0_35px_rgba(250,204,21,0.25)]">
            <svg viewBox="0 0 120 120" class="h-14 w-14 text-primary" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M35 62c-10 0-18 8-18 18 0 9 7 17 16 18h48c10 0 18-8 18-18s-8-18-18-18c-1-10-9-18-20-18-8 0-15 4-18 10-3-2-7-3-11-3-11 0-20 9-20 20z" fill="currentColor" opacity="0.18" />
              <path d="M57 24l7 15-7 4-8-13 8-6z" fill="currentColor" />
              <path d="M79 30l5 11-5 3-6-10 6-4z" fill="currentColor" />
              <path d="M49 83l12 12-13 8-11-12 12-8z" fill="currentColor" />
              <path d="M72 78l11 10-11 8-10-10 10-8z" fill="currentColor" />
            </svg>
          </div>
          <h1 class="text-4xl font-bold text-primary mb-3">Storm School</h1>
          <p class="text-base-content/70 max-w-3xl mx-auto text-sm md:text-base">
            Big storm words, made simple. This page is for quick learning, not a textbook.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-3 mb-6">
          <article class="storm-card">
            <div class="card-body">
              <div class="mb-3 flex items-center gap-3">
                <div class="rounded-xl bg-primary/15 p-2 text-primary">
                  <svg viewBox="0 0 64 64" class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M16 43c-7 0-12 5-12 11 0 6 5 11 11 11h31c8 0 14-6 14-14 0-7-5-13-12-14-2-9-10-16-20-16-9 0-17 6-20 14-1-1-2-2-3-2-5 0-9 4-9 9s4 9 9 9z" fill="currentColor" opacity="0.16"/>
                    <path d="M45 24l-6 12m0 0H22m17 0l-4 10" stroke="currentColor"/>
                  </svg>
                </div>
                <h2 class="card-title text-primary">How storms start</h2>
              </div>
              <p class="text-sm text-base-content/70">Storms usually need three things: warm, wet air, a fast-rising air column, and wind that changes direction with height.</p>
              <ul class="list-disc pl-5 text-sm text-base-content/70 mt-3 space-y-1">
                <li>Warm air rises like a lift.</li>
                <li>Moisture gives the storm fuel.</li>
                <li>Wind shear helps the storm spin.</li>
              </ul>
            </div>
          </article>

          <article class="storm-card">
            <div class="card-body">
              <div class="mb-3 flex items-center gap-3">
                <div class="rounded-xl bg-secondary/15 p-2 text-secondary">
                  <svg viewBox="0 0 64 64" class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="3">
                    <circle cx="32" cy="32" r="21" stroke="currentColor" opacity="0.35" />
                    <path d="M32 11v42M11 32h42" stroke="currentColor" opacity="0.5" />
                    <path d="M18 18c7 7 13 13 14 28 1-12 7-21 14-28" stroke="currentColor" />
                  </svg>
                </div>
                <h2 class="card-title text-secondary">Radar: the storm map</h2>
              </div>
              <p class="text-sm text-base-content/70">Radar shows where rain and wind are moving. A curved hook shape can hint that a storm is rotating.</p>
              <ul class="list-disc pl-5 text-sm text-base-content/70 mt-3 space-y-1">
                <li>Bright reds and pinks = stronger echoes.</li>
                <li>Hook shape = possible rotation.</li>
                <li>Movement arrows help you track where it is heading.</li>
              </ul>
            </div>
          </article>

          <article class="storm-card">
            <div class="card-body">
              <div class="mb-3 flex items-center gap-3">
                <div class="rounded-xl bg-accent/15 p-2 text-accent">
                  <svg viewBox="0 0 64 64" class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M34 8l-9 21h9l-4 27 17-25H34l5-23z" fill="currentColor" opacity="0.18" />
                    <path d="M34 8l-9 21h9l-4 27 17-25H34l5-23z" stroke="currentColor" />
                  </svg>
                </div>
                <h2 class="card-title text-accent">Stay safe</h2>
              </div>
              <p class="text-sm text-base-content/70">A watch means “storm possible.” A warning means “get ready now.” If the sky gets weird, move indoors fast.</p>
              <ul class="list-disc pl-5 text-sm text-base-content/70 mt-3 space-y-1">
                <li>Know your exit route.</li>
                <li>Keep a shelter plan ready.</li>
                <li>Do not chase the storm just to “see it happen.”</li>
              </ul>
            </div>
          </article>
        </div>

        <div class="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article class="storm-card">
            <div class="card-body">
              <div class="mb-3 flex items-center gap-3">
                <div class="rounded-xl bg-primary/15 p-2 text-primary">
                  <svg viewBox="0 0 64 64" class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M12 46h40" stroke="currentColor" />
                    <path d="M18 32l8-8 8 8 10-10 8 8" stroke="currentColor" />
                    <path d="M10 52h44" stroke="currentColor" opacity="0.35" />
                  </svg>
                </div>
                <h2 class="card-title text-primary">EF scale, the easy version</h2>
              </div>
              <div class="space-y-2 mt-3 text-sm text-base-content/70">
                <div class="rounded-xl bg-base-300/40 p-3"><strong>EF0:</strong> roof and tree damage, but still mostly manageable.</div>
                <div class="rounded-xl bg-base-300/40 p-3"><strong>EF1:</strong> stronger winds, more roof damage and broken branches.</div>
                <div class="rounded-xl bg-base-300/40 p-3"><strong>EF2:</strong> serious damage to homes and big trees.</div>
                <div class="rounded-xl bg-base-300/40 p-3"><strong>EF3+</strong> huge destruction and major danger.</div>
              </div>
            </div>
          </article>

          <article class="storm-card">
            <div class="card-body">
              <div class="mb-3 flex items-center gap-3">
                <div class="rounded-xl bg-secondary/15 p-2 text-secondary">
                  <svg viewBox="0 0 64 64" class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="3">
                    <path d="M18 41c-6 0-10 4-10 10 0 5 4 9 9 9h24c8 0 14-6 14-14 0-7-5-12-12-13-1-9-9-15-19-15-9 0-16 5-19 13-1-1-2-1-4-1-5 0-9 4-9 9s4 9 9 9z" fill="currentColor" opacity="0.16" />
                    <path d="M22 28l5 4-5 5m11-9l-5 4 5 5" stroke="currentColor"/>
                  </svg>
                </div>
                <h2 class="card-title text-secondary">Maine storm tips</h2>
              </div>
              <ul class="list-disc pl-5 text-sm text-base-content/70 mt-3 space-y-2">
                <li>Harbor wind can jump fast when a front passes by.</li>
                <li>Storms can build quickly inland after a cold front.</li>
                <li>Open ridges and coastlines can make gusts feel way stronger.</li>
                <li>On warning days, stay where you have a clear indoors shelter.</li>
              </ul>
            </div>
          </article>
        </div>
      </div>
    </div>
  `,
  styles: ``
})
export class LearnComponent {}