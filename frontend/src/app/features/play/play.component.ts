import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-play',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-[calc(100vh-4rem)] p-6">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-8">
          <span class="text-6xl mb-4 block">🎮</span>
          <h1 class="text-4xl font-bold text-primary mb-3">Play</h1>
          <p class="text-base-content/60 max-w-3xl mx-auto">
            Test your storm knowledge with trivia quizzes and log your own chase adventures.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <article class="card bg-base-200/70 border border-base-300 shadow-lg">
            <div class="card-body">
              <h2 class="card-title text-primary">Radar Quiz</h2>
              <p class="text-sm text-base-content/60">Pick the right interpretation of a velocity couplet and storm motion pattern.</p>
            </div>
          </article>
          <article class="card bg-base-200/70 border border-base-300 shadow-lg">
            <div class="card-body">
              <h2 class="card-title text-secondary">EF Scale Ladder</h2>
              <p class="text-sm text-base-content/60">Match the damage indicators to the likely tornado intensity range.</p>
            </div>
          </article>
          <article class="card bg-base-200/70 border border-base-300 shadow-lg">
            <div class="card-body">
              <h2 class="card-title text-accent">Chase Log</h2>
              <p class="text-sm text-base-content/60">Track mileage, location, and notes for your next storm intercept.</p>
            </div>
          </article>
        </div>
      </div>
    </div>
  `,
  styles: ``
})
export class PlayComponent {}