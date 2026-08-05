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
            Historical threat logs by region — Maine first, then USA &amp; Canada, then global — plus personal storm chase records.
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
                  <label class="text-[10px] uppercase tracking-widest text-base-content/50 font-bold block">Region Scope</label>
                  <select [(ngModel)]="filters.scope" (change)="loadHistory()" class="select select-bordered w-full select-sm bg-base-200 border-2 border-base-300 rounded-xl font-bold">
                    <option value="maine">Maine</option>
                    <option value="national">USA &amp; Canada</option>
                    <option value="global">Global</option>
                    <option value="">All scopes</option>
                  </select>
                </div>

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
                  <select [(ngModel)]="sortMode" (change)="loadHistory()" class="select select-bordered w-full select-sm bg-base-200 border-2 border-base-300 rounded-xl font-bold">
                    <option value="newest">Issued: Newest</option>
                    <option value="oldest">Issued: Oldest</option>
                    <option value="severity">Highest Severity</option>
                    <option value="ending">Ended Most Recently</option>
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
                <div class="text-right text-base-content/50 text-xs font-bold uppercase tracking-widest mb-2">
                  @if (totalHistory > 0) {
                    Showing {{ pageStart }}–{{ pageEnd }} of {{ totalHistory }} entries
                  } @else {
                    0 entries found
                  }
                </div>
                
                @if (history.length === 0) {
                  <div class="bg-base-100 border-4 border-base-300 rounded-[2rem] shadow-[6px_6px_0_0_rgba(69,44,99,1)] p-12 text-center">
                    <span class="text-5xl block mb-3">💨</span>
                    <h3 class="text-xl font-black text-white uppercase italic font-sans">Nothing found</h3>
                    <p class="text-base-content/60 font-bold text-sm mt-2">
                      @if (filters.scope === 'global') {
                        Global archive is reserved for non-US/Canada sources — nothing stored yet.
                      } @else {
                        Try adjusting your filters, or wait for the next alert poll to archive entries.
                      }
                    </p>
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
                          <div class="flex flex-wrap gap-1.5 mt-2">
                            <span class="badge badge-sm border border-primary/40 bg-primary/10 text-primary font-black uppercase text-[9px]">{{ scopeLabel(entry.scope) }}</span>
                            @if (entry.eventCode) {
                              <span class="badge badge-sm border border-secondary/40 bg-secondary/10 text-secondary font-black uppercase text-[9px]">{{ entry.eventCode }}</span>
                            }
                            @if (entry.office) {
                              <span class="badge badge-sm border border-base-300 bg-base-200 text-base-content/70 font-bold text-[9px]">{{ entry.office }}</span>
                            }
                            @if (entry.source) {
                              <span class="badge badge-sm border border-accent/40 bg-accent/10 text-accent font-black uppercase text-[9px]">{{ entry.source }}</span>
                            }
                            <span class="badge badge-sm border border-base-300 bg-base-200 font-bold uppercase text-[9px]">{{ entry.status || 'archived' }}</span>
                          </div>
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

                      <div class="mt-3 grid gap-2 sm:grid-cols-3 text-[10px] uppercase tracking-widest text-base-content/50 font-bold">
                        <div>
                          <span class="block text-base-content/30 text-[8px]">Issued</span>
                          <span>{{ formatTimestamp(entry.startsAt || entry.datePulled) }}</span>
                        </div>
                        <div>
                          <span class="block text-base-content/30 text-[8px]">Ended / Expires</span>
                          <span>{{ formatTimestamp(entry.endsAt) }}</span>
                        </div>
                        <div class="sm:text-right">
                          <span class="block text-base-content/30 text-[8px]">Age</span>
                          <span>{{ relativeTime(entry.startsAt || entry.datePulled) }}</span>
                        </div>
                      </div>
                      <div class="mt-3 flex items-center justify-between border-t border-base-300 pt-2 text-[9px] uppercase tracking-widest text-base-content/35 font-bold">
                        <span>{{ entry.category }}</span>
                        @if (entry.sourceUrl) {
                          <a [href]="entry.sourceUrl" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Source ↗</a>
                        }
                      </div>
                    </div>
                  </article>
                }

                @if (totalPages > 1) {
                  <div class="flex items-center justify-center gap-3 pt-4">
                    <button class="btn btn-sm btn-ghost border-2 border-base-300 rounded-xl font-black uppercase" [disabled]="currentPage === 1" (click)="previousPage()">← Newer</button>
                    <span class="text-xs font-black uppercase tracking-widest text-base-content/60">Page {{ currentPage }} / {{ totalPages }}</span>
                    <button class="btn btn-sm btn-ghost border-2 border-base-300 rounded-xl font-black uppercase" [disabled]="currentPage === totalPages" (click)="nextPage()">Older →</button>
                  </div>
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
    scope: 'maine',
    tornadoOnly: false
  };

  sortMode: 'newest' | 'oldest' | 'severity' | 'ending' = 'newest';
  timeRange: 'all' | '24h' | '7d' | '30d' = 'all';
  readonly pageSize = 25;
  currentPage = 1;
  totalHistory = 0;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalHistory / this.pageSize));
  }

  get pageStart(): number {
    return this.totalHistory === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalHistory);
  }

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

  loadHistory(resetPage = true) {
    if (resetPage) this.currentPage = 1;
    this.refreshHistoryTrigger.next();
  }

  previousPage(): void {
    if (this.currentPage <= 1) return;
    this.currentPage--;
    this.refreshHistoryTrigger.next();
  }

  nextPage(): void {
    if (this.currentPage >= this.totalPages) return;
    this.currentPage++;
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
      result = result.filter(i => this.timestamp(i.startsAt || i.datePulled) > cutoff);
    }

    // Sort by the actual event timestamps. datePulled is retained as a
    // compatibility fallback for records created before startsAt existed.
    result = [...result].sort((a, b) => {
      if (this.sortMode === 'severity') {
        const weight: Record<string, number> = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 };
        const severityDiff = (weight[b.severity] || 0) - (weight[a.severity] || 0);
        if (severityDiff !== 0) return severityDiff;
      }
      if (this.sortMode === 'ending') {
        return this.timestamp(b.endsAt) - this.timestamp(a.endsAt);
      }
      const diff = this.timestamp(b.startsAt || b.datePulled) - this.timestamp(a.startsAt || a.datePulled);
      return this.sortMode === 'oldest' ? -diff : diff;
    });

    this.totalHistory = result.length;
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    const start = (this.currentPage - 1) * this.pageSize;
    return result.slice(start, start + this.pageSize);
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

  formatTimestamp(dateStr?: string): string {
    if (!dateStr) return 'Not provided';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return 'Unknown';
    return d.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  }

  relativeTime(dateStr?: string): string {
    const ts = this.timestamp(dateStr);
    if (!ts) return 'Unknown';
    const seconds = Math.round((ts - Date.now()) / 1000);
    const abs = Math.abs(seconds);
    const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    if (abs < 3600) return formatter.format(Math.round(seconds / 60), 'minute');
    if (abs < 86400) return formatter.format(Math.round(seconds / 3600), 'hour');
    if (abs < 86400 * 30) return formatter.format(Math.round(seconds / 86400), 'day');
    if (abs < 86400 * 365) return formatter.format(Math.round(seconds / (86400 * 30)), 'month');
    return formatter.format(Math.round(seconds / (86400 * 365)), 'year');
  }

  private timestamp(dateStr?: string): number {
    if (!dateStr) return 0;
    const value = new Date(dateStr).getTime();
    return Number.isNaN(value) ? 0 : value;
  }

  scopeLabel(scope?: string): string {
    switch ((scope || '').toLowerCase()) {
      case 'maine': return 'Maine';
      case 'usa': return 'USA';
      case 'canada': return 'Canada';
      case 'global': return 'Global';
      default: return scope || '—';
    }
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

