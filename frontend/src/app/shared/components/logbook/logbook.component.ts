import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TrackerIncident, WeatherAlert, WeatherService } from '../../../core/weather.service';
import { Observable, Subscription, interval, startWith, switchMap, map } from 'rxjs';

@Component({
  selector: 'app-logbook',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- Floating Action Button -->
    <div class="fixed bottom-20 right-6 md:bottom-8 z-[100]">
      <button 
        class="btn btn-circle btn-primary btn-lg border-4 border-base-300 shadow-[4px_4px_0_0_rgba(69,44,99,1)] hover:scale-110 hover:-translate-y-2 transition-all duration-300 flex items-center justify-center bg-primary"
        (click)="openLogbook()"
        title="Open Logbook"
      >
        <span class="text-3xl drop-shadow-md">📖</span>
      </button>
    </div>

    <!-- Modal Dialog — Blackboard Style -->
    <dialog id="hud_modal" class="modal modal-bottom sm:modal-middle backdrop-blur-md">
      <div class="modal-box sm:max-w-5xl overflow-hidden p-0 relative h-[85vh] sm:h-auto sm:max-h-[85vh] flex flex-col rounded-3xl border-0 chalkboard">
        
        <!-- Chalk dust texture -->
        <div class="chalk-dust"></div>
        <div class="chalk-smudge"></div>

        <!-- Header -->
        <div class="chalkboard-header">
          <div class="flex items-center gap-3 relative z-10 min-w-0">
            <span class="text-2xl shrink-0">📡</span>
            <div class="min-w-0">
              <h2 class="chalk-title text-xl md:text-2xl">Threat Logs</h2>
              <p class="chalk-status">
                <span class="animate-pulse">●</span> System Online
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 relative z-10 shrink-0">
            <a routerLink="/archive" class="chalk-link" (click)="closeModal()">
              Full Archive →
            </a>
            <form method="dialog">
              <button class="chalk-close">✕</button>
            </form>
          </div>
        </div>

        <!-- Content Split -->
        <div class="flex flex-col md:flex-row flex-1 overflow-hidden z-10">
          
          <!-- Live Feed (Left) -->
          <div class="md:w-2/5 chalkboard-panel-left">
            <h3 class="chalk-section-title">
              <span>⚡ Live Feed</span>
              <span class="chalk-badge-pulse">POLLING</span>
            </h3>
            
            <div class="flex-1 overflow-y-auto pr-2 chalk-scroll space-y-2">
              @if (liveAlerts.length === 0) {
                <div class="chalk-empty">
                  <span class="block text-3xl mb-2 animate-bounce">👀</span>
                  <span class="text-xs">SCANNING... NO ACTIVE ALERTS</span>
                </div>
              }
              
              @for (alert of liveAlerts; track alert.id) {
                <div class="chalk-card">
                  <div class="chalk-severity-bar" [ngClass]="getSeverityColorClass(alert.severity)"></div>
                  <div class="pl-3 min-w-0">
                    <div class="flex justify-between items-center gap-1 mb-1">
                      <span class="chalk-id">{{ alert.id.substring(0, 6) }}</span>
                      <span class="chalk-severity-tag" [style.color]="getSeverityChalkColor(alert.severity)">{{ alert.severity }}</span>
                    </div>
                    <h4 class="chalk-card-title">{{ alert.headline }}</h4>
                    <p class="chalk-card-sub truncate">📍 {{ alert.area }}</p>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Recent History (Right) — Last 48 Hours Only -->
          <div class="md:w-3/5 chalkboard-panel-right">
            <h3 class="chalk-section-title">
              <span>🕐 Last 48 Hours</span>
              <a routerLink="/archive" class="chalk-see-all" (click)="closeModal()">See All →</a>
            </h3>

            <div class="flex-1 overflow-y-auto pr-2 chalk-scroll">
              @if (recentHistory$ | async; as incidents) {
                @if (incidents.length === 0) {
                  <div class="chalk-empty">
                    <span class="block text-3xl mb-2">💾</span>
                    <span class="text-xs">NO RECENT THREATS (48H)</span>
                  </div>
                } @else {
                  <div class="space-y-2">
                    @for (incident of incidents; track incident.id) {
                      <div class="chalk-card">
                        <div class="chalk-severity-bar" [ngClass]="getSeverityColorClass(incident.severity)"></div>
                        <div class="pl-3 min-w-0 flex-1">
                          <div class="flex justify-between items-center gap-1 mb-1">
                            <span class="chalk-card-title-sm">{{ incident.isTornado ? '🌪️' : '⛈️' }} {{ incident.headline }}</span>
                            <span class="chalk-severity-tag" [style.color]="getSeverityChalkColor(incident.severity)">{{ incident.severity }}</span>
                          </div>
                          <div class="flex flex-wrap gap-x-3 gap-y-0.5">
                            <span class="chalk-card-sub">📍 {{ incident.area }}</span>
                            <span class="chalk-card-sub">🕐 {{ formatDate(incident.datePulled) }}</span>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }
              }
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="chalkboard-footer">
          <span class="text-[10px] opacity-40">Older entries are stored in the full Archive.</span>
          <a routerLink="/archive" class="chalk-link" (click)="closeModal()">🗄️ Open Archive</a>
        </div>
      </div>
    </dialog>
  `,
  styles: [`
    /* === BLACKBOARD BASE === */
    .chalkboard {
      background: #2a2a2e;
      color: #d4d4d8;
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      border: 6px solid #3f3f46;
      box-shadow: inset 0 0 60px rgba(0,0,0,0.4), 8px 8px 0 rgba(69,44,99,0.6);
    }

    /* Chalk dust texture overlay */
    .chalk-dust {
      position: absolute;
      inset: 0;
      opacity: 0.06;
      pointer-events: none;
      z-index: 0;
      background-image: 
        radial-gradient(circle at 15% 25%, #fff 0.5px, transparent 8%),
        radial-gradient(circle at 75% 60%, #fff 0.5px, transparent 8%),
        radial-gradient(circle at 50% 80%, #fff 0.5px, transparent 8%),
        radial-gradient(circle at 30% 90%, #fff 0.5px, transparent 8%);
      background-size: 100px 100px;
    }

    .chalk-smudge {
      position: absolute;
      inset: 0;
      opacity: 0.03;
      pointer-events: none;
      z-index: 0;
      background: repeating-linear-gradient(
        -45deg,
        transparent, transparent 8px,
        rgba(255,255,255,0.08) 8px,
        rgba(255,255,255,0.08) 9px
      );
    }

    /* === HEADER === */
    .chalkboard-header {
      padding: 12px 16px;
      border-bottom: 2px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 10;
      position: sticky;
      top: 0;
      background: rgba(0,0,0,0.2);
      gap: 8px;
    }

    .chalk-title {
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #00e5ff;
      text-shadow: 0 0 10px rgba(0,229,255,0.3);
      white-space: nowrap;
    }

    .chalk-status {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #39ff14;
      margin-top: 2px;
    }

    .chalk-link {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #00e5ff;
      padding: 4px 10px;
      border: 1px solid rgba(0,229,255,0.3);
      border-radius: 8px;
      text-decoration: none;
      white-space: nowrap;
      transition: background 0.2s;
    }
    .chalk-link:hover { background: rgba(0,229,255,0.1); }

    .chalk-close {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      color: #ff6b6b;
      background: transparent;
      cursor: pointer;
      transition: background 0.2s;
    }
    .chalk-close:hover { background: rgba(255,107,107,0.1); }

    /* === PANELS === */
    .chalkboard-panel-left {
      border-bottom: 2px solid rgba(255,255,255,0.06);
      padding: 12px;
      display: flex;
      flex-direction: column;
      height: 40vh;
      overflow: hidden;
      background: rgba(0,0,0,0.08);
    }
    @media (min-width: 768px) {
      .chalkboard-panel-left {
        border-bottom: none;
        border-right: 2px solid rgba(255,255,255,0.06);
        height: auto;
      }
    }

    .chalkboard-panel-right {
      padding: 12px;
      display: flex;
      flex-direction: column;
      height: 40vh;
      overflow: hidden;
    }
    @media (min-width: 768px) {
      .chalkboard-panel-right { height: auto; }
    }

    .chalk-section-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: rgba(255,255,255,0.5);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }

    .chalk-badge-pulse {
      font-size: 9px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid rgba(57,255,20,0.3);
      color: #39ff14;
      animation: pulse 2s infinite;
    }

    .chalk-see-all {
      font-size: 9px;
      font-weight: 800;
      color: #00e5ff;
      text-decoration: none;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .chalk-see-all:hover { text-decoration: underline; }

    /* === CARDS === */
    .chalk-card {
      padding: 8px 10px;
      border-radius: 10px;
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.02);
      display: flex;
      transition: background 0.15s;
    }
    .chalk-card:hover { background: rgba(255,255,255,0.05); }

    .chalk-severity-bar {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
    }

    .chalk-id {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      opacity: 0.3;
    }

    .chalk-severity-tag {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .chalk-card-title {
      font-size: 12px;
      font-weight: 700;
      color: #e4e4e7;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .chalk-card-title-sm {
      font-size: 11px;
      font-weight: 700;
      color: #e4e4e7;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .chalk-card-sub {
      font-size: 10px;
      opacity: 0.5;
      font-weight: 600;
    }

    .chalk-empty {
      text-align: center;
      padding: 24px 12px;
      opacity: 0.4;
      border: 1px dashed rgba(255,255,255,0.1);
      border-radius: 12px;
      margin-top: 20px;
      font-weight: 700;
    }

    /* === FOOTER === */
    .chalkboard-footer {
      padding: 8px 16px;
      border-top: 1px solid rgba(255,255,255,0.06);
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 10;
      background: rgba(0,0,0,0.15);
      font-weight: 700;
    }

    /* === SCROLLBAR === */
    .chalk-scroll::-webkit-scrollbar { width: 6px; }
    .chalk-scroll::-webkit-scrollbar-track { background: transparent; }
    .chalk-scroll::-webkit-scrollbar-thumb {
      background: rgba(0,229,255,0.2);
      border-radius: 999px;
    }
    .chalk-scroll::-webkit-scrollbar-thumb:hover {
      background: rgba(0,229,255,0.4);
    }
  `]
})
export class LogbookComponent implements OnDestroy {
  private readonly weatherService = inject(WeatherService);
  
  recentHistory$: Observable<TrackerIncident[]> | null = null;
  liveAlerts: WeatherAlert[] = [];
  
  private pollingSub?: Subscription;

  openLogbook() {
    // Only fetch last 48 hours of history
    this.recentHistory$ = this.weatherService.getHistory().pipe(
      map(incidents => {
        const cutoff = Date.now() - (48 * 60 * 60 * 1000);
        return incidents.filter(i => new Date(i.datePulled).getTime() > cutoff);
      })
    );
    
    if (!this.pollingSub) {
      this.pollingSub = interval(30000).pipe(
        startWith(0),
        switchMap(() => this.weatherService.getAlerts())
      ).subscribe(response => {
        this.liveAlerts = response.alerts;
      });
    }

    const modal = document.getElementById('hud_modal') as HTMLDialogElement;
    if (modal) {
      modal.showModal();
    }
  }

  closeModal() {
    const modal = document.getElementById('hud_modal') as HTMLDialogElement;
    if (modal) {
      modal.close();
    }
  }

  ngOnDestroy() {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
    }
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getSeverityColorClass(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'extreme': return 'bg-error';
      case 'severe': return 'bg-accent';
      case 'moderate': return 'bg-warning';
      default: return 'bg-primary';
    }
  }

  getSeverityChalkColor(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'extreme': return '#ff6b6b';
      case 'severe': return '#00e5ff';
      case 'moderate': return '#fbbf24';
      default: return '#a78bfa';
    }
  }
}
