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
        class="btn btn-circle btn-primary btn-lg border-4 border-base-300 shadow-[4px_4px_0_0_rgba(69,44,99,1)] hover:scale-110 hover:-translate-y-2 transition-all duration-300 flex items-center justify-center bg-primary"
        (click)="openLogbook()"
        title="Open Logbook"
      >
        <span class="text-3xl drop-shadow-md">📖</span>
      </button>
    </div>

    <!-- Modal Dialog -->
    <dialog id="hud_modal" class="modal modal-bottom sm:modal-middle backdrop-blur-md">
      <div class="modal-box bg-base-100 text-base-content border-4 border-base-300 shadow-[12px_12px_0_0_rgba(69,44,99,1)] sm:max-w-6xl overflow-hidden p-0 relative h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-[2.5rem]">
        
        <!-- Bubbly Header -->
        <div class="bg-base-200 p-5 border-b-4 border-base-300 flex justify-between items-center z-10 sticky top-0 relative overflow-hidden">
          <!-- Fun diagonal stripes decoration -->
          <div class="absolute inset-0 opacity-[0.05] pointer-events-none" style="background: repeating-linear-gradient(45deg, transparent, transparent 15px, #fff 15px, #fff 30px);"></div>
          
          <div class="flex items-center gap-4 relative z-10">
            <div class="w-14 h-14 rounded-full bg-secondary text-secondary-content flex items-center justify-center text-3xl border-4 border-base-300 shadow-[4px_4px_0_0_rgba(69,44,99,1)] -rotate-[10deg] hover:rotate-0 transition-transform">
              📡
            </div>
            <div>
              <h2 class="text-3xl md:text-4xl font-black tracking-wide text-primary drop-shadow-[3px_3px_0_rgba(69,44,99,1)] uppercase italic leading-none font-sans" style="-webkit-text-stroke: 1px rgba(69,44,99,0.5);">
                Threat Logs
              </h2>
              <p class="text-xs text-success font-bold tracking-widest mt-1 uppercase flex items-center gap-2">
                <span class="animate-pulse">●</span> System Online
              </p>
            </div>
          </div>
          <form method="dialog" class="relative z-10">
            <button class="btn btn-circle btn-error border-4 border-base-300 shadow-[4px_4px_0_0_rgba(69,44,99,1)] text-white hover:scale-110 transition-transform text-xl font-black">✕</button>
          </form>
        </div>

        <!-- Content Split Layout -->
        <div class="flex flex-col md:flex-row flex-1 overflow-hidden z-10">
          
          <!-- Live Feed Sidebar -->
          <div class="md:w-1/3 border-b-4 md:border-b-0 md:border-r-4 border-base-300 bg-base-200/50 p-5 flex flex-col h-1/2 md:h-auto overflow-hidden">
            <h3 class="text-sm font-black text-secondary uppercase mb-4 flex items-center justify-between border-b-4 border-base-300 pb-3 font-sans italic tracking-wider">
              <span>⚡ Live Uplink</span>
              <span class="text-accent animate-pulse font-bold text-[10px] bg-accent/20 px-2 py-1 rounded-full border border-accent/50">POLLING</span>
            </h3>
            
            <div class="flex-1 overflow-y-auto pr-3 custom-scrollbar space-y-4">
              @if (liveAlerts.length === 0) {
                <div class="text-base-content/60 font-bold text-sm text-center mt-12 bg-base-300/30 p-6 rounded-3xl border-2 border-base-300 border-dashed">
                  <span class="block text-4xl mb-3 animate-bounce">👀</span>
                  SCANNING...<br>NO ACTIVE ALERTS DETECTED.
                </div>
              }
              
              @for (alert of liveAlerts; track alert.id) {
                <div class="bg-base-100 border-4 border-base-300 p-4 rounded-3xl relative overflow-hidden group hover:-translate-y-1 hover:shadow-[4px_4px_0_0_rgba(69,44,99,1)] transition-all">
                  <!-- Highlight bar -->
                  <div class="absolute left-0 top-0 bottom-0 w-3" [ngClass]="getSeverityColorClass(alert.severity)"></div>
                  
                  <div class="pl-3">
                    <div class="flex justify-between items-start mb-2">
                      <span class="text-[10px] uppercase font-bold text-base-content/50 bg-base-200 px-2 py-1 rounded-lg">ID: {{ alert.id.substring(0, 8) }}</span>
                      <span class="text-[10px] font-black uppercase px-2 py-1 rounded-lg border-2" [ngClass]="getSeverityBgClass(alert.severity)">{{ alert.severity }}</span>
                    </div>
                    <h4 class="font-bold text-base font-sans text-white leading-tight mb-2">{{ alert.headline }}</h4>
                    <p class="text-xs text-base-content/70 font-semibold truncate">📍 {{ alert.area }}</p>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Archived Threat Logs -->
          <div class="md:w-2/3 p-5 flex flex-col h-1/2 md:h-auto overflow-hidden bg-base-100 relative">
            
            <h3 class="text-sm font-black text-primary uppercase mb-4 flex items-center justify-between border-b-4 border-base-300 pb-3 font-sans italic tracking-wider">
              <span>🗄️ Database Archive</span>
              <span class="text-base-content/50 text-[10px] bg-base-200 px-2 py-1 rounded-full font-bold">LOCAL ONLY</span>
            </h3>

            <div class="flex-1 overflow-y-auto pr-3 custom-scrollbar">
              @if (history$ | async; as incidents) {
                @if (incidents.length === 0) {
                  <div class="flex flex-col justify-center items-center h-full opacity-60">
                    <span class="text-6xl block mb-4 grayscale">💾</span>
                    <h3 class="text-xl font-black text-base-content">DATABASE EMPTY</h3>
                    <p class="font-bold text-sm">NO HISTORICAL THREATS RECORDED.</p>
                  </div>
                } @else {
                  <div class="space-y-4">
                    @for (incident of incidents; track incident.id) {
                      <div class="bg-base-200 border-4 border-base-300 p-5 rounded-[2rem] relative group hover:-translate-y-1 hover:shadow-[6px_6px_0_0_rgba(69,44,99,1)] transition-all overflow-hidden">
                        
                        <div class="flex flex-wrap justify-between items-start gap-3 mb-4">
                          <div class="flex items-center gap-4">
                            <div class="w-14 h-14 rounded-2xl flex items-center justify-center bg-base-100 border-4 border-base-300 shadow-[2px_2px_0_0_rgba(69,44,99,0.5)] rotate-3 group-hover:rotate-6 transition-transform">
                              <span class="text-3xl drop-shadow-md" *ngIf="incident.isTornado">🌪️</span>
                              <span class="text-3xl drop-shadow-md" *ngIf="!incident.isTornado">⛈️</span>
                            </div>
                            <div>
                              <h3 class="font-black text-lg md:text-xl text-white font-sans">{{ incident.headline }}</h3>
                              <span class="text-[10px] text-primary/80 font-bold uppercase tracking-wider bg-primary/10 px-2 py-1 rounded-lg inline-block mt-1">LOGGED: {{ formatDate(incident.datePulled) }}</span>
                            </div>
                          </div>
                          
                          <div class="text-right">
                            <span class="px-3 py-1 text-[11px] rounded-xl font-black uppercase border-2 shadow-sm" 
                                  [ngClass]="incident.isTornado ? 'bg-error/20 text-error border-error/50' : 'bg-accent/20 text-accent border-accent/50'">
                              {{ incident.severity }}
                            </span>
                          </div>
                        </div>
                        
                        <div class="grid sm:grid-cols-2 gap-3 mt-4 bg-base-100 p-4 rounded-2xl border-2 border-base-300 text-xs font-bold">
                          <div class="flex flex-col gap-1">
                            <span class="text-secondary uppercase text-[10px] bg-secondary/10 w-fit px-2 py-0.5 rounded-md">📍 Impact Zone</span>
                            <span class="text-base-content">{{ incident.area }}</span>
                          </div>
                          <div class="flex flex-col gap-1">
                            <span class="text-secondary uppercase text-[10px] bg-secondary/10 w-fit px-2 py-0.5 rounded-md">🏷️ Event Type</span>
                            <span class="text-base-content capitalize">{{ incident.category.replace('-', ' ') }}</span>
                          </div>
                        </div>

                        @if (incident.description) {
                          <div class="mt-4 text-xs text-base-content/80 font-semibold bg-base-300/30 p-3 rounded-xl border-l-4 border-primary italic">
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
    .custom-scrollbar::-webkit-scrollbar {
      width: 12px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(43, 27, 61, 0.5);
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #00e5ff;
      border-radius: 10px;
      border: 3px solid rgba(43, 27, 61, 0.5);
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #39ff14;
    }
  `]
})
export class LogbookComponent implements OnDestroy {
  private readonly weatherService = inject(WeatherService);
  
  history$: Observable<TrackerIncident[]> | null = null;
  liveAlerts: WeatherAlert[] = [];
  
  private pollingSub?: Subscription;

  openLogbook() {
    // Fetch History (Now properly catches 500 errors in service)
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
}
