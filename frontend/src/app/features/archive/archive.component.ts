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
    <div class="min-h-[calc(100vh-4rem)] p-4 md:p-6">
      <div class="max-w-6xl mx-auto">

        <div class="mb-6 md:mb-8">
          <h1 class="text-3xl md:text-4xl font-black text-white italic uppercase tracking-wider font-sans">
            Archive
          </h1>
          <p class="text-base-content/60 text-sm font-semibold mt-1">
            Historical threat logs — Maine first, then USA &amp; Canada — plus chase records.
          </p>
        </div>

        <div class="flex gap-2 mb-6">
          <button
            type="button"
            class="btn btn-sm rounded-xl font-black uppercase tracking-wider min-h-11"
            [ngClass]="activeTab === 'nws' ? 'btn-primary' : 'btn-ghost border border-base-300'"
            (click)="activeTab = 'nws'"
          >
            NWS Alerts
          </button>
          <button
            type="button"
            class="btn btn-sm rounded-xl font-black uppercase tracking-wider min-h-11"
            [ngClass]="activeTab === 'chase' ? 'btn-secondary' : 'btn-ghost border border-base-300'"
            (click)="activeTab = 'chase'"
          >
            Chase Logs
          </button>
        </div>

        @if (activeTab === 'nws') {
          <div class="grid md:grid-cols-4 gap-4 md:gap-6">

            <!-- Mobile: collapsible filters -->
            <div class="md:hidden">
              <details class="storm-card group" [open]="filtersOpen">
                <summary
                  class="list-none cursor-pointer p-4 min-h-14 flex items-center justify-between font-black uppercase tracking-widest text-sm text-primary"
                  (click)="filtersOpen = !filtersOpen; $event.preventDefault()"
                >
                  Filters
                  <span class="text-base-content/40 transition-transform" [class.rotate-180]="filtersOpen">▼</span>
                </summary>
                <div class="px-4 pb-4 space-y-4 border-t border-base-300/50 pt-4">
                  <ng-container *ngTemplateOutlet="filterFields"></ng-container>
                </div>
              </details>
            </div>

            <!-- Desktop: sticky sidebar -->
            <aside class="hidden md:block md:col-span-1">
              <article class="storm-card p-4 space-y-4 sticky top-20">
                <h3 class="text-sm font-black text-primary uppercase tracking-widest border-b border-base-300 pb-2">Filters</h3>
                <ng-container *ngTemplateOutlet="filterFields"></ng-container>
              </article>
            </aside>

            <ng-template #filterFields>
              <div class="space-y-1.5">
                <label class="text-[10px] uppercase tracking-widest text-base-content/45 font-bold block">Region</label>
                <select [(ngModel)]="filters.scope" (change)="loadHistory()" class="select select-bordered w-full select-sm bg-base-200/80 border border-base-300 rounded-lg font-semibold">
                  <option value="maine">Maine</option>
                  <option value="national">USA &amp; Canada</option>
                  <option value="global">Global</option>
                  <option value="">All scopes</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] uppercase tracking-widest text-base-content/45 font-bold block">Search</label>
                <input type="text" [(ngModel)]="filters.search" (keyup.enter)="loadHistory()" placeholder="Area or headline…" class="input input-bordered w-full input-sm bg-base-200/80 border border-base-300 rounded-lg font-semibold">
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] uppercase tracking-widest text-base-content/45 font-bold block">Severity</label>
                <select [(ngModel)]="filters.severity" (change)="loadHistory()" class="select select-bordered w-full select-sm bg-base-200/80 border border-base-300 rounded-lg font-semibold">
                  <option value="">Any</option>
                  <option value="Extreme">Extreme</option>
                  <option value="Severe">Severe</option>
                  <option value="Moderate">Moderate</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] uppercase tracking-widest text-base-content/45 font-bold block">Sort</label>
                <select [(ngModel)]="sortMode" (change)="loadHistory()" class="select select-bordered w-full select-sm bg-base-200/80 border border-base-300 rounded-lg font-semibold">
                  <option value="newest">Issued: Newest</option>
                  <option value="oldest">Issued: Oldest</option>
                  <option value="severity">Highest Severity</option>
                  <option value="ending">Ended Most Recently</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-[10px] uppercase tracking-widest text-base-content/45 font-bold block">Time</label>
                <select [(ngModel)]="timeRange" (change)="loadHistory()" class="select select-bordered w-full select-sm bg-base-200/80 border border-base-300 rounded-lg font-semibold">
                  <option value="all">All Time</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="24h">Last 24 Hours</option>
                </select>
              </div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [(ngModel)]="filters.tornadoOnly" (change)="loadHistory()" class="checkbox checkbox-primary checkbox-sm">
                <span class="font-semibold text-sm">Tornado only</span>
              </label>
              <button type="button" (click)="loadHistory()" class="btn btn-primary btn-sm w-full rounded-xl font-black uppercase tracking-wider min-h-11">
                Apply
              </button>
            </ng-template>

            <div class="md:col-span-3 space-y-2">
              @if (history$ | async; as history) {
                <div class="text-right text-base-content/45 text-[10px] font-bold uppercase tracking-widest mb-1">
                  @if (totalHistory > 0) {
                    {{ pageStart }}–{{ pageEnd }} of {{ totalHistory }}
                  } @else {
                    0 entries
                  }
                </div>

                @if (history.length === 0) {
                  <div class="storm-card p-10 text-center">
                    <h3 class="text-lg font-black text-white uppercase italic font-sans">Nothing found</h3>
                    <p class="text-base-content/55 font-semibold text-sm mt-2">
                      @if (filters.scope === 'global') {
                        Global archive is reserved for non-US/Canada sources — nothing stored yet.
                      } @else {
                        Try adjusting filters, or wait for the next alert poll.
                      }
                    </p>
                  </div>
                }

                @for (entry of history; track entry.id) {
                  <article class="storm-card relative overflow-hidden group">
                    <div class="absolute left-0 top-0 bottom-0 w-1" [ngClass]="getSeverityColorClass(entry.severity)"></div>
                    <div class="pl-4 pr-3 py-3">
                      <div class="flex justify-between items-start gap-3">
                        <div class="min-w-0 flex-1">
                          <h4 class="text-sm md:text-base font-black font-sans text-white leading-snug truncate">{{ entry.headline }}</h4>
                          <p class="text-xs text-base-content/55 font-semibold mt-0.5 truncate">{{ entry.area }}</p>
                          <div class="flex flex-wrap gap-1.5 mt-1.5">
                            <span class="badge badge-sm border border-primary/40 bg-primary/10 text-primary font-black uppercase text-[9px]">{{ scopeLabel(entry.scope) }}</span>
                            @if (entry.eventCode) {
                              <span class="badge badge-sm border border-secondary/40 bg-secondary/10 text-secondary font-black uppercase text-[9px]">{{ entry.eventCode }}</span>
                            }
                          </div>
                        </div>
                        <button
                          type="button"
                          (click)="deleteHistory(entry.id)"
                          class="btn btn-ghost btn-xs text-error/70 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0"
                          title="Delete"
                        >✕</button>
                      </div>

                      @if (entry.description) {
                        <p class="mt-2 text-xs text-base-content/70 font-medium line-clamp-2">{{ entry.description }}</p>
                      }

                      <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-wider text-base-content/40 font-bold">
                        <span>{{ formatTimestamp(entry.startsAt || entry.datePulled) }}</span>
                        <span>{{ relativeTime(entry.startsAt || entry.datePulled) }}</span>
                        @if (entry.office || entry.source) {
                          <span class="ml-auto normal-case tracking-normal text-base-content/35">
                            {{ entry.office || '' }}{{ entry.office && entry.source ? ' · ' : '' }}{{ entry.source || '' }}
                          </span>
                        }
                      </div>
                    </div>
                  </article>
                }

                @if (totalPages > 1) {
                  <div class="flex items-center justify-center gap-3 pt-3">
                    <button type="button" class="btn btn-sm btn-ghost border border-base-300 rounded-xl font-black uppercase min-h-11" [disabled]="currentPage === 1" (click)="previousPage()">← Newer</button>
                    <span class="text-xs font-black uppercase tracking-widest text-base-content/50">{{ currentPage }} / {{ totalPages }}</span>
                    <button type="button" class="btn btn-sm btn-ghost border border-base-300 rounded-xl font-black uppercase min-h-11" [disabled]="currentPage === totalPages" (click)="nextPage()">Older →</button>
                  </div>
                }
              }
            </div>
          </div>
        }

        @if (activeTab === 'chase') {
          <div class="grid md:grid-cols-3 gap-4 md:gap-6">
            <div class="md:col-span-1">
              <article class="storm-card p-4 space-y-4">
                <h3 class="text-sm font-black text-secondary uppercase tracking-widest border-b border-base-300 pb-2">New Chase Log</h3>
                <div class="space-y-3">
                  <div>
                    <label class="text-[10px] uppercase tracking-widest text-base-content/45 font-bold block mb-1">Title *</label>
                    <input type="text" [(ngModel)]="newChaseLog.title" class="input input-bordered w-full input-sm bg-base-200/80 border border-base-300 rounded-lg font-semibold">
                  </div>
                  <div>
                    <label class="text-[10px] uppercase tracking-widest text-base-content/45 font-bold block mb-1">Date *</label>
                    <input type="datetime-local" [(ngModel)]="newChaseLog.chaseDate" class="input input-bordered w-full input-sm bg-base-200/80 border border-base-300 rounded-lg font-semibold" style="color-scheme: dark;">
                  </div>
                  <div>
                    <label class="text-[10px] uppercase tracking-widest text-base-content/45 font-bold block mb-1">State *</label>
                    <input type="text" [(ngModel)]="newChaseLog.state" class="input input-bordered w-full input-sm bg-base-200/80 border border-base-300 rounded-lg font-semibold">
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="text-[10px] uppercase tracking-widest text-base-content/45 font-bold block mb-1">Miles</label>
                      <input type="number" [(ngModel)]="newChaseLog.milesDriven" class="input input-bordered w-full input-sm bg-base-200/80 border border-base-300 rounded-lg font-semibold">
                    </div>
                    <div>
                      <label class="text-[10px] uppercase tracking-widest text-base-content/45 font-bold block mb-1">EF</label>
                      <select [(ngModel)]="newChaseLog.efRating" class="select select-bordered w-full select-sm bg-base-200/80 border border-base-300 rounded-lg font-semibold">
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
                    <label class="text-[10px] uppercase tracking-widest text-base-content/45 font-bold block mb-1">Notes</label>
                    <textarea [(ngModel)]="newChaseLog.notes" rows="3" class="textarea textarea-bordered w-full bg-base-200/80 border border-base-300 rounded-lg font-semibold text-sm"></textarea>
                  </div>
                  <button type="button" (click)="submitChaseLog()" class="btn btn-secondary btn-sm w-full rounded-xl font-black uppercase tracking-wider min-h-11">
                    + Add Log
                  </button>
                </div>
              </article>
            </div>

            <div class="md:col-span-2 space-y-2">
              @if (chaseLogs$ | async; as logs) {
                @if (logs.length === 0) {
                  <div class="storm-card p-10 text-center">
                    <h3 class="text-lg font-black text-white uppercase italic font-sans">No chase logs yet</h3>
                    <p class="text-base-content/55 font-semibold text-sm mt-2">Write your first one.</p>
                  </div>
                }

                @for (log of logs; track log.id) {
                  <article class="storm-card p-4 relative group">
                    <div class="flex justify-between items-start gap-3 mb-2">
                      <h4 class="text-base font-black font-sans text-white uppercase italic">{{ log.title }}</h4>
                      <div class="flex items-center gap-2 shrink-0">
                        @if (log.efRating !== null && log.efRating !== undefined) {
                          <span class="badge badge-error font-black border text-[10px] rounded-lg">EF{{ log.efRating }}</span>
                        }
                        <button type="button" (click)="deleteChaseLog(log.id)" class="btn btn-ghost btn-xs text-error/70 opacity-0 group-hover:opacity-100 focus:opacity-100" title="Delete">✕</button>
                      </div>
                    </div>
                    <div class="flex flex-wrap gap-3 text-xs font-semibold text-base-content/55 mb-2 pb-2 border-b border-base-300/50">
                      <span>{{ formatDate(log.chaseDate) }}</span>
                      <span>{{ log.state }}</span>
                      <span>{{ log.milesDriven }} mi</span>
                    </div>
                    @if (log.notes) {
                      <p class="text-sm text-base-content/75 font-medium whitespace-pre-line">{{ log.notes }}</p>
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
  styles: `
    details > summary::-webkit-details-marker { display: none; }
  `
})
export class ArchiveComponent implements OnInit {
  private weatherService = inject(WeatherService);

  activeTab: 'nws' | 'chase' = 'nws';
  filtersOpen = false;

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
}
