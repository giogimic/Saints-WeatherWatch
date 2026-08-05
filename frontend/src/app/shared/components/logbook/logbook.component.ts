import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { TrackerIncident, WeatherAlert, WeatherAlertsResponse, WeatherService } from '../../../core/weather.service';
import { Observable, Subscription, interval, startWith, switchMap } from 'rxjs';

@Component({
  selector: 'app-logbook',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Floating Action Button -->
    <div class="fixed bottom-20 right-6 md:bottom-8 z-[100]">
      <button 
        class="btn btn-circle btn-accent btn-lg shadow-[0_0_20px_rgba(0,255,255,0.5)] border-2 border-cyan-400 hover:scale-105 transition-transform"
        (click)="openLogbook()"
        title="Command Center HUD"
      >
        <span class="text-3xl">📡</span>
      </button>
    </div>

    <!-- HUD Modal Dialog -->
    <dialog id="hud_modal" class="modal modal-bottom sm:modal-middle backdrop-blur-sm">
      <div class="modal-box bg-slate-900/90 text-cyan-50 shadow-[0_0_50px_rgba(0,255,255,0.2)] border border-cyan-500/50 sm:max-w-6xl overflow-hidden p-0 relative h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-xl">
        
        <!-- HUD Scanlines overlay -->
        <div class="absolute inset-0 pointer-events-none opacity-[0.03] z-50 mix-blend-overlay" style="background-image: repeating-linear-gradient(transparent, transparent 2px, #0ff 3px); background-size: 100% 4px;"></div>
        
        <!-- Header -->
        <div class="bg-slate-950/80 p-4 border-b border-cyan-500/30 flex justify-between items-center z-10 sticky top-0 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(255,0,0,0.8)]"></div>
            <div>
              <h2 class="text-2xl font-bold tracking-widest uppercase font-mono text-cyan-400 drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]">Command Center Uplink</h2>
              <p class="text-[10px] text-cyan-600 font-mono tracking-widest mt-1 uppercase">SYSTEM.STATUS: ONLINE // SECURE CONNECTION ESTABLISHED</p>
            </div>
          </div>
          <form method="dialog">
            <button class="btn btn-sm btn-circle btn-ghost text-cyan-400 hover:bg-cyan-900/50 border border-cyan-500/20 font-mono">✕</button>
          </form>
        </div>

        <!-- Content Split Layout -->
        <div class="flex flex-col md:flex-row flex-1 overflow-hidden z-10">
          
          <!-- Live Feed Sidebar -->
          <div class="md:w-1/3 border-b md:border-b-0 md:border-r border-cyan-500/30 bg-slate-900/50 p-4 flex flex-col h-1/2 md:h-auto overflow-hidden">
            <h3 class="text-xs tracking-widest font-mono text-cyan-500 uppercase mb-4 flex items-center justify-between border-b border-cyan-500/20 pb-2">
              <span>Live Uplink</span>
              <span class="text-amber-500 animate-pulse font-bold text-xs">● POLLING</span>
            </h3>
            
            <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              @if (liveAlerts.length === 0) {
                <div class="text-cyan-700 font-mono text-xs text-center mt-10 opacity-70">
                  <span class="block text-2xl mb-2">📡</span>
                  SCANNING FOR ANOMALIES...<br>NO ACTIVE ALERTS DETECTED.
                </div>
              }
              
              @for (alert of liveAlerts; track alert.id) {
                <div class="bg-slate-800/80 border border-slate-700 p-3 rounded-sm relative overflow-hidden group hover:border-cyan-500/50 transition-colors">
                  <!-- Highlight bar -->
                  <div class="absolute left-0 top-0 bottom-0 w-1" [ngClass]="getSeverityColorClass(alert.severity)"></div>
                  
                  <div class="pl-2">
                    <div class="flex justify-between items-start mb-1">
                      <span class="text-[9px] uppercase font-mono text-slate-400 tracking-wider">ID: {{ alert.id.substring(0, 12) }}...</span>
                      <span class="text-[9px] font-bold uppercase font-mono px-1 rounded-sm" [ngClass]="getSeverityBgClass(alert.severity)">{{ alert.severity }}</span>
                    </div>
                    <h4 class="font-bold text-sm font-mono text-slate-200 leading-tight mb-2">{{ alert.headline }}</h4>
                    <p class="text-xs text-slate-400 line-clamp-2">📍 {{ alert.area }}</p>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Archived Threat Logs -->
          <div class="md:w-2/3 p-4 flex flex-col h-1/2 md:h-auto overflow-hidden bg-slate-950/40">
            <h3 class="text-xs tracking-widest font-mono text-cyan-500 uppercase mb-4 flex items-center justify-between border-b border-cyan-500/20 pb-2">
              <span>Archived Threat Logs</span>
              <span class="text-slate-500 text-[10px]">LOCAL DATABASE</span>
            </h3>

            <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              @if (history$ | async; as incidents) {
                @if (incidents.length === 0) {
                  <div class="text-center p-8 opacity-50 text-cyan-600 font-mono">
                    <span class="text-4xl block mb-2">💾</span>
                    <p>DATABASE EMPTY. NO HISTORICAL THREATS RECORDED.</p>
                  </div>
                } @else {
                  <div class="space-y-4">
                    @for (incident of incidents; track incident.id) {
                      <div class="bg-slate-900/60 border border-slate-800 p-4 rounded-md relative group hover:bg-slate-800/60 transition-colors">
                        
                        <div class="flex flex-wrap justify-between items-start gap-2 mb-3">
                          <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-sm flex items-center justify-center bg-slate-950 border border-slate-800 shadow-inner">
                              <span class="text-2xl" *ngIf="incident.isTornado">🌪️</span>
                              <span class="text-xl" *ngIf="!incident.isTornado">⛈️</span>
                            </div>
                            <div>
                              <h3 class="font-bold text-base text-cyan-100 font-mono">{{ incident.headline }}</h3>
                              <span class="text-[10px] text-cyan-600 uppercase font-mono tracking-widest">LOGGED: {{ formatDate(incident.datePulled) }}</span>
                            </div>
                          </div>
                          
                          <div class="text-right">
                            <span class="px-2 py-0.5 text-[10px] rounded-sm font-mono tracking-widest font-bold uppercase border" 
                                  [ngClass]="incident.isTornado ? 'bg-red-900/30 text-red-400 border-red-500/50' : 'bg-amber-900/30 text-amber-400 border-amber-500/50'">
                              {{ incident.severity }}
                            </span>
                          </div>
                        </div>
                        
                        <div class="grid sm:grid-cols-2 gap-4 mt-3 bg-slate-950/50 p-3 rounded-sm border border-slate-800/50 text-xs font-mono">
                          <div>
                            <span class="text-cyan-700 uppercase text-[9px] block mb-1">Impact Zone</span>
                            <span class="text-slate-300">📍 {{ incident.area }}</span>
                          </div>
                          <div>
                            <span class="text-cyan-700 uppercase text-[9px] block mb-1">Event Classification</span>
                            <span class="text-slate-300 capitalize">{{ incident.category.replace('-', ' ') }}</span>
                          </div>
                        </div>

                        <div class="mt-3 text-xs text-slate-400 border-l-2 border-cyan-700/50 pl-3 italic font-mono leading-relaxed">
                          > {{ incident.description }}
                        </div>
                      </div>
                    }
                  </div>
                }
              }
            </div>
          </div>

        </div>
      </div>
    </dialog>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(15, 23, 42, 0.5);
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(6, 182, 212, 0.3);
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(6, 182, 212, 0.6);
    }
  `]
})
export class LogbookComponent implements OnDestroy {
  private readonly weatherService = inject(WeatherService);
  
  history$: Observable<TrackerIncident[]> | null = null;
  liveAlerts: WeatherAlert[] = [];
  
  private pollingSub?: Subscription;

  openLogbook() {
    // Fetch History
    this.history$ = this.weatherService.getHistory();
    
    // Start Live Polling every 30 seconds
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
    switch (severity.toLowerCase()) {
      case 'extreme': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]';
      case 'severe': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]';
      case 'moderate': return 'bg-yellow-400';
      default: return 'bg-cyan-500';
    }
  }

  getSeverityBgClass(severity: string): string {
    switch (severity.toLowerCase()) {
      case 'extreme': return 'bg-red-900/40 text-red-400 border border-red-500/50';
      case 'severe': return 'bg-amber-900/40 text-amber-400 border border-amber-500/50';
      case 'moderate': return 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/50';
      default: return 'bg-cyan-900/40 text-cyan-400 border border-cyan-500/50';
    }
  }
}
