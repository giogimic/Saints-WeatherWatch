import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WeatherService } from '../../core/weather.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <!-- Background pattern -->
      <div class="absolute inset-0 opacity-[0.03] pointer-events-none" style="background: repeating-linear-gradient(45deg, transparent, transparent 20px, #fff 20px, #fff 40px);"></div>
      
      <div class="text-center max-w-4xl relative z-10">
        <div class="mb-6 text-8xl md:text-9xl animate-bounce drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">🌪️</div>
        <h1 class="text-4xl sm:text-5xl md:text-8xl font-black text-white mb-4 tracking-wide uppercase italic font-sans drop-shadow-[4px_4px_0_rgba(69,44,99,1)]" style="-webkit-text-stroke: 2px rgba(69,44,99,0.8);">
          Weather<span class="text-primary drop-shadow-[2px_2px_0_rgba(69,44,99,1)]">Watch</span>
        </h1>
        <p class="text-xl md:text-2xl text-base-content/80 mb-2 font-bold font-sans tracking-wide">
          Your personal storm-chasing command center
        </p>
        <p class="text-base text-base-content/60 mb-10 font-bold uppercase tracking-widest text-xs">
          Live tracking • Real-time alerts • Storm education • Chase logs
        </p>

        @if (overview$ | async; as overview) {
          <div class="flex flex-wrap gap-4 justify-center mb-12">
            <div class="badge badge-error gap-2 text-lg py-5 px-6 border-4 border-base-300 shadow-[4px_4px_0_0_rgba(69,44,99,1)] rounded-2xl font-black uppercase">
              <span class="w-3 h-3 rounded-full bg-white animate-pulse"></span>
              Active alerts: <span class="text-white">{{ overview.totalAlerts }}</span>
            </div>
            <div class="badge badge-warning gap-2 text-lg py-5 px-6 border-4 border-base-300 shadow-[4px_4px_0_0_rgba(69,44,99,1)] rounded-2xl font-black uppercase">
              Severe: <span class="text-white">{{ overview.severeAlerts }}</span>
            </div>
            <div class="badge badge-info gap-2 text-lg py-5 px-6 border-4 border-base-300 shadow-[4px_4px_0_0_rgba(69,44,99,1)] rounded-2xl font-black uppercase">
              Watches: <span class="text-white">{{ overview.watchCount }}</span>
            </div>
          </div>
        }

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <a routerLink="/map" class="card bg-base-100 hover:bg-base-200 transition-all shadow-[8px_8px_0_0_rgba(69,44,99,1)] border-4 border-base-300 rounded-[2rem] hover:-translate-y-2 hover:shadow-[12px_12px_0_0_rgba(69,44,99,1)] group">
            <div class="card-body items-center text-center py-10">
              <span class="text-6xl mb-4 group-hover:scale-110 transition-transform drop-shadow-md">🗺️</span>
              <h2 class="card-title text-2xl font-black text-primary uppercase italic tracking-wider font-sans">Live Map</h2>
              <p class="text-sm text-base-content/70 font-bold">Track storms in real-time</p>
            </div>
          </a>
          <a routerLink="/alerts" class="card bg-base-100 hover:bg-base-200 transition-all shadow-[8px_8px_0_0_rgba(69,44,99,1)] border-4 border-base-300 rounded-[2rem] hover:-translate-y-2 hover:shadow-[12px_12px_0_0_rgba(69,44,99,1)] group">
            <div class="card-body items-center text-center py-10">
              <span class="text-6xl mb-4 group-hover:scale-110 transition-transform drop-shadow-md">🚨</span>
              <h2 class="card-title text-2xl font-black text-accent uppercase italic tracking-wider font-sans">Alerts</h2>
              <p class="text-sm text-base-content/70 font-bold">Active warnings & watches</p>
            </div>
          </a>
          <a routerLink="/learn" class="card bg-base-100 hover:bg-base-200 transition-all shadow-[8px_8px_0_0_rgba(69,44,99,1)] border-4 border-base-300 rounded-[2rem] hover:-translate-y-2 hover:shadow-[12px_12px_0_0_rgba(69,44,99,1)] group">
            <div class="card-body items-center text-center py-10">
              <span class="text-6xl mb-4 group-hover:scale-110 transition-transform drop-shadow-md">📚</span>
              <h2 class="card-title text-2xl font-black text-secondary uppercase italic tracking-wider font-sans">Learn</h2>
              <p class="text-sm text-base-content/70 font-bold">How tornadoes work</p>
            </div>
          </a>
        </div>

        <div class="mt-12 alert alert-info bg-base-200/80 border-4 border-info shadow-[6px_6px_0_0_rgba(69,44,99,1)] rounded-[2rem] p-6 text-left flex items-start gap-4">
          <span class="text-2xl">💡</span>
          <div class="text-left">
            <h3 class="font-bold text-sm text-secondary uppercase tracking-wide">Did You Know?</h3>
            <p class="text-base-content/70 text-sm mt-1">
              The Enhanced Fujita (EF) Scale rates tornadoes from EF0 (65-85 mph winds) to EF5
              (over 200 mph). Only about 0.1% of tornadoes reach EF5 intensity.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: ``
})
export class HomeComponent {
  private readonly weatherService = inject(WeatherService);

  overview$ = this.weatherService.getOverview();
}