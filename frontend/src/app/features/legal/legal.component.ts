import { Component } from '@angular/core';

@Component({
  selector: 'app-legal',
  standalone: true,
  template: `
    <div class="min-h-[calc(100vh-8rem)] max-w-3xl mx-auto px-6 py-10">
      <p class="text-xs font-black uppercase tracking-[0.2em] text-primary mb-3">Saints Gaming</p>
      <h1 class="text-3xl md:text-4xl font-black italic uppercase tracking-wide text-white mb-2">
        Legal
      </h1>
      <p class="text-sm text-base-content/60 font-semibold mb-8">
        Saints Weather Watch · © {{ year }} Saints Gaming. All rights reserved.
      </p>

      <section class="space-y-6 text-sm leading-relaxed text-base-content/80">
        <div>
          <h2 class="text-lg font-black uppercase tracking-wider text-white mb-2">Ownership</h2>
          <p>
            Source code, UI, branding, and original game content (including Storm World SIM features)
            are © Saints Gaming unless a file expressly states otherwise. See the repository
            <code class="text-primary">LICENSE</code> for the baseline reservation of rights.
          </p>
        </div>

        <div>
          <h2 class="text-lg font-black uppercase tracking-wider text-white mb-2">Not an emergency service</h2>
          <p>
            This app is informational and educational. It is not a substitute for official warnings,
            emergency alerts, or life-safety instructions from the National Weather Service, local
            emergency management, or first responders.
          </p>
        </div>

        <div>
          <h2 class="text-lg font-black uppercase tracking-wider text-white mb-2">Data attribution</h2>
          <p>
            Weather and hazard layers come from public third-party sources (NWS, NOAA, IEM, USGS, and
            others). Saints Gaming does not claim ownership of that upstream data.
          </p>
        </div>

        <div>
          <h2 class="text-lg font-black uppercase tracking-wider text-white mb-2">Storm World (SIM)</h2>
          <p>
            Storm World gameplay is a simulation layer. SIM events, currency, and research must not
            be confused with real-world NWS severity or official risk messaging.
          </p>
        </div>

        <div>
          <h2 class="text-lg font-black uppercase tracking-wider text-white mb-2">Publisher</h2>
          <p>
            <a
              href="https://saintsgaming.net"
              target="_blank"
              rel="noopener noreferrer"
              class="link link-primary font-bold"
            >saintsgaming.net</a>
            · Live ops:
            <a
              href="https://wn.saintsgaming.net"
              target="_blank"
              rel="noopener noreferrer"
              class="link link-primary font-bold"
            >wn.saintsgaming.net</a>
          </p>
        </div>
      </section>
    </div>
  `,
})
export class LegalComponent {
  readonly year = new Date().getFullYear();
}
