import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { TrackerIncident, WeatherAlert, WeatherService } from '../../../core/weather.service';
import { Observable, Subscription, interval, startWith, switchMap } from 'rxjs';

@Component({
  selector: 'app-logbook',
  standalone: true,
  imports: [CommonModule],
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

    <!-- Modal Dialog — Chalkboard Style -->
    <dialog id="hud_modal" class="modal modal-bottom sm:modal-middle backdrop-blur-md">
      <div class="modal-box sm:max-w-6xl overflow-hidden p-0 relative h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-[2.5rem] border-0"
           style="background: #1e2c24; color: #e8f0e8; font-family: 'Chalkboard SE', 'Comic Sans MS', cursive;">
        
        <!-- Chalk dust overlays -->
        <div class="absolute inset-0 opacity-20 pointer-events-none z-0" style="background-image: radial-gradient(circle at 20% 30%, #ffffff 1px, transparent 15%), radial-gradient(circle at 80% 70%, #ffffff 1px, transparent 15%); background-size: 150px 150px; filter: blur(2px);"></div>
        <div class="absolute inset-0 opacity-10 pointer-events-none z-0" style="background: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px);"></div>

        <!-- Chalkboard Header -->
        <div class="p-5 border-b-2 border-dashed border-white/30 flex justify-between items-center z-10 sticky top-0 relative overflow-hidden" style="background: rgba(0,0,0,0.2);">
          <div class="flex items-center gap-4 relative z-10">
            <div class="w-14 h-14 rounded-full flex items-center justify-center text-3xl border-2 border-dashed border-white/50" style="background: rgba(255,255,255,0.1);">
              📡
            </div>
            <div>
              <h2 class="text-3xl md:text-4xl font-bold tracking-wide leading-none" style="color: #fff9e6; text-shadow: 2px 2px 0 rgba(0,0,0,0.5);">
                ~ Threat Logs ~
              </h2>
              <p class="text-xs font-bold tracking-widest mt-1 uppercase flex items-center gap-2" style="color: #88ff88;">
                <span class="animate-pulse">●</span> System Online
              </p>
            </div>
          </div>
          <form method="dialog" class="relative z-10">
            <button class="w-10 h-10 rounded-full border-2 border-dashed border-white/50 flex items-center justify-center text-xl font-bold hover:bg-white/10 transition-colors" style="color: #ffaaaa;">✕</button>
          </form>
        </div>

        <!-- Content Split Layout -->
        <div class="flex flex-col md:flex-row flex-1 overflow-hidden z-10">
          
          <!-- Live Feed Sidebar -->
          <div class="md:w-1/3 border-b-2 md:border-b-0 md:border-r-2 border-dashed border-white/20 p-5 flex flex-col h-1/2 md:h-auto overflow-hidden" style="background: rgba(0,0,0,0.1);">
            <h3 class="text-sm font-bold uppercase mb-4 flex items-center justify-between border-b-2 border-dashed border-white/20 pb-3 tracking-wider" style="color: #fffdcc;">
              <span>⚡ Live Uplink</span>
              <span class="text-[10px] px-2 py-1 rounded-full border border-dashed animate-pulse" style="color: #88ff88; border-color: rgba(136,255,136,0.4);">POLLING</span>
            </h3>
            
            <div class="flex-1 overflow-y-auto pr-3 chalk-scrollbar space-y-4">
              @if (liveAlerts.length === 0) {
                <div class="text-center mt-12 p-6 rounded-xl border-2 border-dashed opacity-60" style="border-color: rgba(255,255,255,0.2);">
                  <span class="block text-4xl mb-3 animate-bounce">👀</span>
                  SCANNING...<br>NO ACTIVE ALERTS DETECTED.
                </div>
              }
              
              @for (alert of liveAlerts; track alert.id) {
                <div class="p-4 rounded-xl relative overflow-hidden border-2 border-dashed hover:bg-white/5 transition-colors" style="border-color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.03);">
                  <!-- Chalk highlight bar -->
                  <div class="absolute left-0 top-0 bottom-0 w-1.5" [ngClass]="getSeverityColorClass(alert.severity)"></div>
                  
                  <div class="pl-3">
                    <div class="flex justify-between items-start mb-2">
                      <span class="text-[10px] uppercase font-bold opacity-50">ID: {{ alert.id.substring(0, 8) }}</span>
                      <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-dashed" [style.color]="getSeverityChalkColor(alert.severity)" [style.border-color]="getSeverityChalkColor(alert.severity)">{{ alert.severity }}</span>
                    </div>
                    <h4 class="font-bold text-base leading-tight mb-2" style="color: #fff9e6;">{{ alert.headline }}</h4>
                    <p class="text-xs opacity-70 truncate">📍 {{ alert.area }}</p>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Archived Threat Logs -->
          <div class="md:w-2/3 p-5 flex flex-col h-1/2 md:h-auto overflow-hidden relative">
            
            <h3 class="text-sm font-bold uppercase mb-4 flex items-center justify-between border-b-2 border-dashed border-white/20 pb-3 tracking-wider" style="color: #fffdcc;">
              <span>🗄️ Database Archive</span>
              <span class="text-[10px] opacity-50 px-2 py-1 rounded-full font-bold" style="background: rgba(255,255,255,0.05);">LOCAL ONLY</span>
            </h3>

            <div class="flex-1 overflow-y-auto pr-3 chalk-scrollbar">
              @if (history$ | async; as incidents) {
                @if (incidents.length === 0) {
                  <div class="flex flex-col justify-center items-center h-full opacity-60">
                    <span class="text-6xl block mb-4 grayscale">💾</span>
                    <h3 class="text-xl font-bold" style="color: #fff9e6;">DATABASE EMPTY</h3>
                    <p class="font-bold text-sm opacity-70">NO HISTORICAL THREATS RECORDED.</p>
                  </div>
                } @else {
                  <div class="space-y-4">
                    @for (incident of incidents; track incident.id) {
                      <div class="p-5 rounded-2xl relative group hover:bg-white/5 transition-colors overflow-hidden border-2 border-dashed" style="border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.03);">
                        
                        <div class="flex flex-wrap justify-between items-start gap-3 mb-4">
                          <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-xl flex items-center justify-center border-2 border-dashed" style="border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.05);">
                              <span class="text-2xl" *ngIf="incident.isTornado">🌪️</span>
                              <span class="text-2xl" *ngIf="!incident.isTornado">⛈️</span>
                            </div>
                            <div>
                              <h3 class="font-bold text-lg md:text-xl" style="color: #fff9e6;">{{ incident.headline }}</h3>
                              <span class="text-[10px] font-bold uppercase tracking-wider opacity-60">LOGGED: {{ formatDate(incident.datePulled) }}</span>
                            </div>
                          </div>
                          
                          <div class="text-right">
                            <span class="px-2 py-1 text-[11px] rounded font-bold uppercase border border-dashed" 
                                  [style.color]="incident.isTornado ? '#ff8888' : '#88ddff'"
                                  [style.border-color]="incident.isTornado ? 'rgba(255,136,136,0.4)' : 'rgba(136,221,255,0.4)'">
                              {{ incident.severity }}
                            </span>
                          </div>
                        </div>
                        
                        <div class="grid sm:grid-cols-2 gap-3 mt-4 p-3 rounded-xl text-xs font-bold border border-dashed" style="border-color: rgba(255,255,255,0.15); background: rgba(0,0,0,0.15);">
                          <div class="flex flex-col gap-1">
                            <span class="uppercase text-[10px] opacity-50">📍 Impact Zone</span>
                            <span>{{ incident.area }}</span>
                          </div>
                          <div class="flex flex-col gap-1">
                            <span class="uppercase text-[10px] opacity-50">🏷️ Event Type</span>
                            <span class="capitalize">{{ incident.category.replace('-', ' ') }}</span>
                          </div>
                        </div>

                        @if (incident.description) {
                          <div class="mt-4 text-xs opacity-80 italic p-3 rounded-xl border-l-2 border-dashed" style="border-color: rgba(255,253,204,0.4); background: rgba(255,255,255,0.03);">
                            {{ incident.description }}
                          </div>
                        }
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
    .chalk-scrollbar::-webkit-scrollbar {
      width: 10px;
    }
    .chalk-scrollbar::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
    }
    .chalk-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 253, 204, 0.3);
      border-radius: 10px;
      border: 2px solid rgba(30, 44, 36, 0.5);
    }
    .chalk-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 253, 204, 0.5);
    }
  `]
})
export class LogbookComponent implements OnDestroy {
  private readonly weatherService = inject(WeatherService);
  
  history$: Observable<TrackerIncident[]> | null = null;
  liveAlerts: WeatherAlert[] = [];
  
  private pollingSub?: Subscription;

  openLogbook() {
    this.history$ = this.weatherService.getHistory();
    
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
    switch (severity?.toLowerCase()) {
      case 'extreme': return 'bg-error';
      case 'severe': return 'bg-accent';
      case 'moderate': return 'bg-warning';
      default: return 'bg-primary';
    }
  }

  getSeverityChalkColor(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'extreme': return '#ff8888';
      case 'severe': return '#ffcc44';
      case 'moderate': return '#ffdd88';
      default: return '#88ddff';
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
}
