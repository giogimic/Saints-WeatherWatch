import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { WeatherService } from '../../core/weather.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6">
      <div class="text-center max-w-4xl">
        <div class="mb-6 text-7xl animate-pulse-slow">🌪️</div>
        <h1 class="text-5xl md:text-7xl font-extrabold text-base-content mb-4 tracking-tight">
          Weather<span class="text-primary">Watch</span>
        </h1>
        <p class="text-xl md:text-2xl text-base-content/70 mb-2 font-medium">
          Your personal storm-chasing command center
        </p>
        <p class="text-base text-base-content/50 mb-8">
          Live tornado tracking · Real-time alerts · Storm education · Chase logs
        </p>

        @if (headlineAlerts$ | async; as alerts) {
          <div class="flex flex-wrap gap-3 justify-center mb-10">
            <div class="badge badge-error gap-2 text-lg py-4 px-4">
              <span class="loading loading-dot loading-sm"></span>
              Tornado Warnings: <span class="font-bold">{{ alerts.total }}</span>
            </div>
            <div class="badge badge-warning gap-2 text-lg py-4 px-4">
              Severe T-Storm: <span class="font-bold">{{ alerts.severe }}</span>
            </div>
            <div class="badge badge-info gap-2 text-lg py-4 px-4">
              Watches: <span class="font-bold">{{ alerts.watches }}</span>
            </div>
          </div>
        }

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          <a routerLink="/map" class="card bg-base-200 hover:bg-base-300 transition-colors shadow-lg">
            <div class="card-body items-center text-center py-8">
              <span class="text-4xl mb-2">🗺️</span>
              <h2 class="card-title text-primary">Live Map</h2>
              <p class="text-sm text-base-content/60">Track storms in real-time</p>
            </div>
          </a>
          <a routerLink="/alerts" class="card bg-base-200 hover:bg-base-300 transition-colors shadow-lg">
            <div class="card-body items-center text-center py-8">
              <span class="text-4xl mb-2">🚨</span>
              <h2 class="card-title text-accent">Alerts</h2>
              <p class="text-sm text-base-content/60">Active warnings & watches</p>
            </div>
          </a>
          <a routerLink="/learn" class="card bg-base-200 hover:bg-base-300 transition-colors shadow-lg">
            <div class="card-body items-center text-center py-8">
              <span class="text-4xl mb-2">📚</span>
              <h2 class="card-title text-secondary">Learn</h2>
              <p class="text-sm text-base-content/60">How tornadoes work</p>
            </div>
          </a>
        </div>

        <div class="mt-10 alert alert-info bg-base-200/50 border-base-300">
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

  headlineAlerts$ = this.weatherService.getAlerts().pipe(
    map((response) => ({
      total: response.alerts.length,
      severe: response.alerts.filter((alert) => alert.severity === 'Severe').length,
      watches: response.alerts.filter((alert) => alert.status === 'watch').length,
    })),
  );
}