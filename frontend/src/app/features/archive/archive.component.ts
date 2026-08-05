import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WeatherService, TrackerIncident, ChaseLogEntry } from '../../core/weather.service';
import { Observable, BehaviorSubject, switchMap, map } from 'rxjs';

@Component({
  selector: 'app-archive',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-[calc(100vh-4rem)] p-6">
      <div class="max-w-6xl mx-auto">
        
        <!-- Header -->
        <div class="text-center mb-10 relative">
          <div class="absolute inset-0 opacity-[0.05] pointer-events-none -z-10" style="background: repeating-linear-gradient(45deg, transparent, transparent 15px, #fff 15px, #fff 30px);"></div>
          
          <div class="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-3xl bg-base-100 border-4 border-base-300 shadow-[6px_6px_0_0_rgba(69,44,99,1)] rotate-3 hover:-rotate-3 transition-transform">
            <span class="text-6xl drop-shadow-md">🗄️</span>
          </div>
          <h1 class="text-5xl md:text-6xl font-black text-white mb-4 italic uppercase tracking-wider font-sans drop-shadow-[3px_3px_0_rgba(69,44,99,1)]">Archive</h1>
          <p class="text-base-content/80 max-w-3xl mx-auto text-sm md:text-lg font-bold bg-base-200/50 p-4 rounded-2xl border-2 border-base-300 inline-block">
            Historical threat logs &amp; personal storm chase records. Search, filter, and relive past weather events.
          </p>
        </div>

        <!-- Tabs -->
        <div class="flex justify-center gap-4 mb-8">
          <button 
            class="btn border-4 border-base-300 shadow-[4px_4px_0_0_rgba(69,44,99,1)] hover:-translate-y-1 transition-all rounded-xl font-black uppercase text-lg px-6"
            [ngClass]="activeTab === 'nws' ? 'btn-primary' : 'btn-ghost bg-base-200'"
            (click)="activeTab = 'nws'">
            🌩️ NWS Alerts
          </button>
          <button 
            class="btn border-4 border-base-300 shadow-[4px_4px_0_0_rgba(69,44,99,1)] hover:-translate-y-1 transition-all rounded-xl font-black uppercase text-lg px-6"
            [ngClass]="activeTab === 'chase' ? 'btn-secondary' : 'btn-ghost bg-base-200'"
            (click)="activeTab = 'chase'">
            🚗 Chase Logs
          </button>
        </div>

        <!-- NWS Alerts Tab -->
        @if (activeTab === 'nws') {
          <div class="grid md:grid-cols-4 gap-6">
            
            <!-- Filters Panel -->
            <div class="md:col-span-1">
              <article class="bg-base-100 border-4 border-base-300 rounded-[2rem] shadow-[6px_6px_0_0_rgba(69,44,99,1)] p-5 space-y-5">
                <h3 class="text-xl font-black text-primary uppercase italic font-sans tracking-wide border-b-4 border-base-300 pb-3">Filters</h3>
                
                <div class="space-y-2">
                  <label class="text-[10px] uppercase tracking-widest text-base-content/50 font-bold block">Search</label>
                  <input type="text" [(ngModel)]="filters.search" (keyup.enter)="loadHistory()" placeholder="e.g. Penobscot..." class="input input-bordered w-full input-sm bg-base-200 border-2 border-base-300 rounded-xl font-bold">
                </div>

                <div class="space-y-2">
                  <label class="text-[10px] uppercase tracking-widest text-base-content/50 font-bold block">Severity</label>
                  <select [(ngModel)]="filters.severity" (change)="loadHistory()" class="select select-bordered w-full select-sm bg-base-200 border-2 border-base-300 rounded-xl font-bold">
                    <option value="">Any</option>
                    <option value="Extreme">Extreme</option>
                    <option value="Severe">Severe</option>
                    <option value="Moderate">Moderate</option>
                  </select>
                </div>

                <div class="space-y-2">
                  <label class="text-[10px] uppercase tracking-widest text-base-content/50 font-bold block">Sort By</label>
                  <select [(ngModel)]="sortDirection" (change)="loadHistory()" class="select select-bordered w-full select-sm bg-base-200 border-2 border-base-300 rounded-xl font-bold">
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>

                <div class="space-y-2">
                  <label class="text-[10px] uppercase tracking-widest text-base-content/50 font-bold block">Time Range</label>
                  <select [(ngModel)]="timeRange" (change)="loadHistory()" class="select select-bordered w-full select-sm bg-base-200 border-2 border-base-300 rounded-xl font-bold">
                    <option value="all">All Time</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="24h">Last 24 Hours</option>
                  </select>
                </div>

                <div class="flex items-center gap-3">
                  <input type="checkbox" id="tornadoOnly" [(ngModel)]="filters.tornadoOnly" (change)="loadHistory()" class="checkbox checkbox-primary checkbox-sm border-2">
                  <label for="tornadoOnly" class="font-bold text-sm">Tornado Only 🌪️</label>
                </div>

                <button (click)="loadHistory()" class="btn btn-primary w-full border-4 border-base-300 shadow-[4px_4px_0_0_rgba(69,44,99,1)] hover:-translate-y-1 transition-all rounded-xl font-black uppercase">
                  Apply
                </button>
              </article>
            </div>

            <!-- Results Panel -->
            <div class="md:col-span-3 space-y-4">
              @if (history$ | async; as history) {
                <div class="text-right text-base-content/50 text-xs font-bold uppercase tracking-widest mb-2">{{ history.length }} entries found</div>
                
                @if (history.length === 0) {
                  <div class="bg-base-100 border-4 border-base-300 rounded-[2rem] shadow-[6px_6px_0_0_rgba(69,44,99,1)] p-12 text-center">
                    <span class="text-5xl block mb-3">💨</span>
                    <h3 class="text-xl font-black text-white uppercase italic font-sans">Nothing found</h3>
                    <p class="text-base-content/60 font-bold text-sm mt-2">Try adjusting your filters.</p>
                  </div>
                }

                @for (entry of history; track entry.id) {
                  <article class="bg-base-100 border-4 border-base-300 rounded-[2rem] shadow-[6px_6px_0_0_rgba(69,44,99,1)] p-5 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                    <!-- Severity highlight bar -->
                    <div class="absolute left-0 top-0 bottom-0 w-3" [ngClass]="getSeverityColorClass(entry.severity)"></div>

                    <div class="pl-4">
                      <div class="flex justify-between items-start gap-4 mb-3">
                        <div>
                          <div class="flex items-center gap-2 mb-2">
                            <span class="text-2xl">{{ entry.isTornado ? '🌪️' : '⛈️' }}</span>
                            <h4 class="text-xl font-black font-sans text-white uppercase italic drop-shadow-sm">{{ entry.headline }}</h4>
                          </div>
                          <p class="text-sm text-base-content/70 font-bold">📍 {{ entry.area }}</p>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="badge font-black uppercase border-2 shadow-sm px-3 py-3 text-[10px] rounded-xl" [ngClass]="getSeverityBgClass(entry.severity)">{{ entry.severity }}</span>
                          <button (click)="deleteHistory(entry.id)" class="btn btn-circle btn-xs btn-ghost opacity-0 group-hover:opacity-100 transition-opacity text-error hover:bg-error/20" title="Delete">✕</button>
                        </div>
                      </div>

                      @if (entry.description) {
                        <div class="mt-3 text-sm text-base-content/80 font-semibold bg-base-200/50 p-3 rounded-xl border-l-4 border-primary italic">
                          {{ entry.description }}
                        </div>
                      }

                      <div class="mt-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-base-content/40 font-bold">
                        <span>{{ entry.category }}</span>
                        <span>Logged: {{ formatDate(entry.datePulled) }}</span>
                      </div>
                    </div>
                  </article>
                }
              }
            </div>
          </div>
        }

        <!-- Chase Logs Tab -->
        @if (activeTab === 'chase') {
          <div class="grid md:grid-cols-3 gap-6">
            
            <!-- New Entry Form -->
            <div class="md:col-span-1">
              <article class="bg-base-100 border-4 border-base-300 rounded-[2rem] shadow-[6px_6px_0_0_rgba(69,44,99,1)] p-5 space-y-5">
                <h3 class="text-xl font-black text-secondary uppercase italic font-sans tracking-wide border-b-4 border-base-300 pb-3">New Chase Log</h3>
                
                <div class="space-y-4">
                  <div>
                    <label class="text-[10px] uppercase tracking-widest text-base-content/50 font-bold block mb-1">Title *</label>
                    <input type="text" [(ngModel)]="newChaseLog.title" class="input input-bordered w-full input-sm bg-base-200 border-2 border-base-300 rounded-xl font-bold">
                  </div>
                  <div>
                    <label class="text-[10px] uppercase tracking-widest text-base-content/50 font-bold block mb-1">Date *</label>
                    <input type="datetime-local" [(ngModel)]="newChaseLog.chaseDate" class="input input-bordered w-full input-sm bg-base-200 border-2 border-base-300 rounded-xl font-bold" style="color-scheme: dark;">
                  </div>
                  <div>
                    <label class="text-[10px] uppercase tracking-widest text-base-content/50 font-bold block mb-1">State *</label>
                    <input type="text" [(ngModel)]="newChaseLog.state" class="input input-bordered w-full input-sm bg-base-200 border-2 border-base-300 rounded-xl font-bold">
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-[10px] uppercase tracking-widest text-base-content/50 font-bold block mb-1">Miles</label>
                      <input type="number" [(ngModel)]="newChaseLog.milesDriven" class="input input-bordered w-full input-sm bg-base-200 border-2 border-base-300 rounded-xl font-bold">
                    </div>
                    <div>
                      <label class="text-[10px] uppercase tracking-widest text-base-content/50 font-bold block mb-1">EF Rating</label>
                      <select [(ngModel)]="newChaseLog.efRating" class="select select-bordered w-full select-sm bg-base-200 border-2 border-base-300 rounded-xl font-bold">
                        <option [ngValue]="null">N/A</option>
                        <option [ngValue]="0">EF0</option>
                        <option [ngValue]="1">EF1</option>
                        <option [ngValue]="2">EF2</option>
                        <option [ngValue]="3">EF3</option>
                        <option [ngValue]="4">EF4</option>
                        <option [ngValue]="5">EF5</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label class="text-[10px] uppercase tracking-widest text-base-content/50 font-bold block mb-1">Notes</label>
                    <textarea [(ngModel)]="newChaseLog.notes" rows="3" class="textarea textarea-bordered w-full bg-base-200 border-2 border-base-300 rounded-xl font-bold text-sm"></textarea>
                  </div>

                  <button (click)="submitChaseLog()" class="btn btn-secondary w-full border-4 border-base-300 shadow-[4px_4px_0_0_rgba(69,44,99,1)] hover:-translate-y-1 transition-all rounded-xl font-black uppercase">
                    + Add Log
                  </button>
                </div>
              </article>
            </div>

            <!-- Chase Logs List -->
            <div class="md:col-span-2 space-y-4">
              @if (chaseLogs$ | async; as logs) {
                @if (logs.length === 0) {
                  <div class="bg-base-100 border-4 border-base-300 rounded-[2rem] shadow-[6px_6px_0_0_rgba(69,44,99,1)] p-12 text-center">
                    <span class="text-5xl block mb-3">🌪️</span>
                    <h3 class="text-xl font-black text-white uppercase italic font-sans">No Chase Logs Yet</h3>
                    <p class="text-base-content/60 font-bold text-sm mt-2">Write your first one!</p>
                  </div>
                }

                @for (log of logs; track log.id) {
                  <article class="bg-base-100 border-4 border-base-300 rounded-[2rem] shadow-[6px_6px_0_0_rgba(69,44,99,1)] p-5 relative overflow-hidden group hover:-translate-y-1 transition-transform">
                    <div class="flex justify-between items-start gap-4 mb-3">
                      <h4 class="text-2xl font-black font-sans text-white uppercase italic drop-shadow-sm">{{ log.title }}</h4>
                      <div class="flex items-center gap-2">
                        @if (log.efRating !== null && log.efRating !== undefined) {
                          <span class="badge badge-error font-black border-2 shadow-sm px-3 py-3 text-xs rounded-xl">EF{{ log.efRating }}</span>
                        }
                        <button (click)="deleteChaseLog(log.id)" class="btn btn-circle btn-xs btn-ghost opacity-0 group-hover:opacity-100 transition-opacity text-error hover:bg-error/20" title="Delete">✕</button>
                      </div>
                    </div>
                    
                    <div class="flex flex-wrap gap-4 text-sm font-bold text-base-content/70 mb-3 pb-3 border-b-4 border-base-300">
                      <span>📅 {{ formatDate(log.chaseDate) }}</span>
                      <span>📍 {{ log.state }}</span>
                      <span>🚗 {{ log.milesDriven }} miles</span>
                    </div>

                    @if (log.notes) {
                      <div class="text-sm text-base-content/80 font-semibold bg-base-200/50 p-3 rounded-xl border-l-4 border-secondary italic whitespace-pre-line">
                        {{ log.notes }}
                      </div>
                    }
                  </article>
                }
              }
            </div>
          </div>
        }

      </div>
    </div>
  `,
  styles: ``
})
export class ArchiveComponent implements OnInit {
  private weatherService = inject(WeatherService);

  activeTab: 'nws' | 'chase' = 'nws';
  
  // NWS Archive State
  private refreshHistoryTrigger = new BehaviorSubject<void>(undefined);
  history$: Observable<TrackerIncident[]> = this.refreshHistoryTrigger.pipe(
    switchMap(() => this.weatherService.getHistory(this.filters)),
    map(incidents => this.applyClientFilters(incidents))
  );
  
  filters = {
    search: '',
    severity: '',
    category: '',
    tornadoOnly: false
  };

  sortDirection: 'newest' | 'oldest' = 'newest';
  timeRange: 'all' | '24h' | '7d' | '30d' = 'all';

  // Chase Logs State
  private refreshChaseLogsTrigger = new BehaviorSubject<void>(undefined);
  chaseLogs$: Observable<ChaseLogEntry[]> = this.refreshChaseLogsTrigger.pipe(
    switchMap(() => this.weatherService.getChaseLogs())
  );

  newChaseLog: Partial<ChaseLogEntry> = {
    title: '',
    chaseDate: '',
    state: '',
    milesDriven: 0,
    efRating: null as any,
    notes: ''
  };

  ngOnInit() {}

  loadHistory() {
    this.refreshHistoryTrigger.next();
  }

  applyClientFilters(incidents: TrackerIncident[]): TrackerIncident[] {
    let result = incidents;

    // Time range filter
    if (this.timeRange !== 'all') {
      const now = Date.now();
      const ranges: Record<string, number> = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now - (ranges[this.timeRange] || 0);
      result = result.filter(i => new Date(i.datePulled).getTime() > cutoff);
    }

    // Sort
    result = [...result].sort((a, b) => {
      const diff = new Date(b.datePulled).getTime() - new Date(a.datePulled).getTime();
      return this.sortDirection === 'newest' ? diff : -diff;
    });

    return result;
  }

  deleteHistory(id: string) {
    if (confirm('Delete this archived alert?')) {
      this.weatherService.deleteHistory(id).subscribe(() => this.loadHistory());
    }
  }

  loadChaseLogs() {
    this.refreshChaseLogsTrigger.next();
  }

  submitChaseLog() {
    if (!this.newChaseLog.title || !this.newChaseLog.chaseDate || !this.newChaseLog.state) {
      alert('Please fill out Title, Date, and State.');
      return;
    }

    const logToSubmit = {
      ...this.newChaseLog,
      chaseDate: new Date(this.newChaseLog.chaseDate).toISOString()
    };

    this.weatherService.createChaseLog(logToSubmit).subscribe(() => {
      this.newChaseLog = {
        title: '',
        chaseDate: '',
        state: '',
        milesDriven: 0,
        efRating: null as any,
        notes: ''
      };
      this.loadChaseLogs();
    });
  }

  deleteChaseLog(id: string) {
    if (confirm('Delete this chase log?')) {
      this.weatherService.deleteChaseLog(id).subscribe(() => this.loadChaseLogs());
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
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

