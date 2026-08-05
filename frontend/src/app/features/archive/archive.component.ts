import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WeatherService, TrackerIncident, ChaseLogEntry } from '../../core/weather.service';
import { Observable, BehaviorSubject, switchMap } from 'rxjs';

@Component({
  selector: 'app-archive',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Chalkboard Container -->
    <div class="min-h-[calc(100vh-4rem)] p-4 md:p-8 bg-[#1e2c24] text-[#e8f0e8] font-['Chalkboard_SE',_'Comic_Sans_MS',_sans-serif] relative overflow-hidden">
      
      <!-- Subtle eraser smudges background effect -->
      <div class="absolute inset-0 opacity-20 pointer-events-none" style="background-image: radial-gradient(circle at 20% 30%, #ffffff 1px, transparent 15%), radial-gradient(circle at 80% 70%, #ffffff 1px, transparent 15%); background-size: 150px 150px; filter: blur(2px);"></div>
      
      <!-- Chalk dust overlay -->
      <div class="absolute inset-0 opacity-10 pointer-events-none" style="background: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px);"></div>

      <div class="max-w-6xl mx-auto relative z-10">
        
        <!-- Header -->
        <div class="text-center mb-8 border-b-2 border-dashed border-[#e8f0e8]/50 pb-6">
          <h1 class="text-5xl md:text-7xl font-bold tracking-wider mb-2 text-[#fff9e6] drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
            <span class="opacity-80">~</span> Archive <span class="opacity-80">~</span>
          </h1>
          <p class="text-xl opacity-80 italic">Historical Threat Logs & Chase Records</p>
          
          <!-- Tabs -->
          <div class="flex justify-center gap-6 mt-8 text-lg">
            <button 
              class="px-4 py-2 border-2 border-dashed rounded-lg transition-all"
              [class]="activeTab === 'nws' ? 'border-[#fffdcc] text-[#fffdcc] bg-white/10 scale-105' : 'border-transparent opacity-60 hover:opacity-100 hover:border-[#e8f0e8]/30'"
              (click)="activeTab = 'nws'">
              🌩️ NWS Alerts
            </button>
            <button 
              class="px-4 py-2 border-2 border-dashed rounded-lg transition-all"
              [class]="activeTab === 'chase' ? 'border-[#fffdcc] text-[#fffdcc] bg-white/10 scale-105' : 'border-transparent opacity-60 hover:opacity-100 hover:border-[#e8f0e8]/30'"
              (click)="activeTab = 'chase'">
              🚗 Chase Logs
            </button>
          </div>
        </div>

        <!-- NWS Alerts Tab -->
        @if (activeTab === 'nws') {
          <div class="grid md:grid-cols-4 gap-6">
            
            <!-- Filters Panel -->
            <div class="md:col-span-1 space-y-6 border-2 border-dashed border-[#e8f0e8]/30 p-5 rounded-xl bg-white/5">
              <h3 class="text-2xl font-bold border-b-2 border-dashed border-[#e8f0e8]/30 pb-2 mb-4 text-[#fffdcc]">Filters</h3>
              
              <div class="space-y-2">
                <label class="block text-sm opacity-80">Search (Headline or Area)</label>
                <input type="text" [(ngModel)]="filters.search" (keyup.enter)="loadHistory()" class="w-full bg-transparent border-b-2 border-dashed border-[#e8f0e8]/50 p-2 text-white placeholder-white/30 focus:outline-none focus:border-white" placeholder="e.g. Penobscot...">
              </div>

              <div class="space-y-2">
                <label class="block text-sm opacity-80">Severity</label>
                <select [(ngModel)]="filters.severity" (change)="loadHistory()" class="w-full bg-[#2b3a32] border-2 border-dashed border-[#e8f0e8]/50 p-2 rounded-lg text-white focus:outline-none">
                  <option value="">Any</option>
                  <option value="Extreme">Extreme</option>
                  <option value="Severe">Severe</option>
                  <option value="Moderate">Moderate</option>
                </select>
              </div>

              <div class="space-y-2">
                <label class="block text-sm opacity-80">Category</label>
                <input type="text" [(ngModel)]="filters.category" (keyup.enter)="loadHistory()" class="w-full bg-transparent border-b-2 border-dashed border-[#e8f0e8]/50 p-2 text-white placeholder-white/30 focus:outline-none focus:border-white" placeholder="e.g. Met">
              </div>

              <div class="flex items-center gap-3 mt-4">
                <input type="checkbox" id="tornadoOnly" [(ngModel)]="filters.tornadoOnly" (change)="loadHistory()" class="w-5 h-5 accent-[#fffdcc] bg-transparent border-2 border-white">
                <label for="tornadoOnly" class="opacity-90">Tornado Only</label>
              </div>

              <button (click)="loadHistory()" class="w-full mt-4 py-2 border-2 border-dashed border-[#fffdcc] text-[#fffdcc] rounded-lg hover:bg-[#fffdcc]/10 transition-colors">
                Apply Filters
              </button>
            </div>

            <!-- Results Panel -->
            <div class="md:col-span-3 space-y-4">
              @if (history$ | async; as history) {
                <div class="text-right opacity-70 text-sm mb-2">{{ history.length }} entries found</div>
                
                @if (history.length === 0) {
                  <div class="text-center p-12 opacity-50 border-2 border-dashed border-[#e8f0e8]/30 rounded-xl">
                    <span class="text-4xl block mb-2">💨</span>
                    Nothing found in the archives.
                  </div>
                }

                @for (entry of history; track entry.id) {
                  <div class="p-5 border-2 border-dashed border-[#e8f0e8]/40 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors relative group">
                    <div class="flex justify-between items-start gap-4 mb-2">
                      <h4 class="text-xl font-bold text-[#fffdcc]">{{ entry.headline }}</h4>
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-1 text-xs border border-dashed border-[#e8f0e8]/50 rounded">{{ entry.severity }}</span>
                        <button (click)="deleteHistory(entry.id)" class="opacity-0 group-hover:opacity-100 text-[#ffaaaa] hover:text-[#ff5555] transition-opacity" title="Erase Log">✕</button>
                      </div>
                    </div>
                    <div class="text-sm opacity-80 mb-2">📍 {{ entry.area }}</div>
                    @if (entry.description) {
                      <div class="text-sm opacity-70 italic border-l-2 border-dashed border-[#e8f0e8]/30 pl-3 py-1">
                        {{ entry.description }}
                      </div>
                    }
                    <div class="text-xs opacity-50 mt-3 text-right">
                      Logged: {{ formatDate(entry.datePulled) }}
                    </div>
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
            <div class="md:col-span-1 space-y-6 border-2 border-dashed border-[#fffdcc]/40 p-5 rounded-xl bg-[#fffdcc]/5">
              <h3 class="text-2xl font-bold border-b-2 border-dashed border-[#fffdcc]/30 pb-2 mb-4 text-[#fffdcc]">New Log</h3>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm opacity-80 mb-1">Title *</label>
                  <input type="text" [(ngModel)]="newChaseLog.title" class="w-full bg-transparent border-b-2 border-dashed border-[#e8f0e8]/50 p-2 text-white focus:outline-none focus:border-white">
                </div>
                <div>
                  <label class="block text-sm opacity-80 mb-1">Date *</label>
                  <input type="datetime-local" [(ngModel)]="newChaseLog.chaseDate" class="w-full bg-transparent border-b-2 border-dashed border-[#e8f0e8]/50 p-2 text-white focus:outline-none focus:border-white" style="color-scheme: dark;">
                </div>
                <div>
                  <label class="block text-sm opacity-80 mb-1">State *</label>
                  <input type="text" [(ngModel)]="newChaseLog.state" class="w-full bg-transparent border-b-2 border-dashed border-[#e8f0e8]/50 p-2 text-white focus:outline-none focus:border-white">
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm opacity-80 mb-1">Miles</label>
                    <input type="number" [(ngModel)]="newChaseLog.milesDriven" class="w-full bg-transparent border-b-2 border-dashed border-[#e8f0e8]/50 p-2 text-white focus:outline-none focus:border-white">
                  </div>
                  <div>
                    <label class="block text-sm opacity-80 mb-1">EF Rating</label>
                    <select [(ngModel)]="newChaseLog.efRating" class="w-full bg-[#2b3a32] border-2 border-dashed border-[#e8f0e8]/50 p-2 rounded-lg text-white focus:outline-none">
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
                  <label class="block text-sm opacity-80 mb-1">Notes</label>
                  <textarea [(ngModel)]="newChaseLog.notes" rows="3" class="w-full bg-transparent border-2 border-dashed border-[#e8f0e8]/50 rounded-lg p-2 text-white focus:outline-none focus:border-white custom-scrollbar"></textarea>
                </div>

                <button (click)="submitChaseLog()" class="w-full py-3 border-2 border-dashed border-[#aaffaa] text-[#aaffaa] rounded-lg hover:bg-[#aaffaa]/10 transition-colors font-bold text-lg mt-2">
                  + Add Log
                </button>
              </div>
            </div>

            <!-- Chase Logs List -->
            <div class="md:col-span-2 space-y-4">
              @if (chaseLogs$ | async; as logs) {
                @if (logs.length === 0) {
                  <div class="text-center p-12 opacity-50 border-2 border-dashed border-[#e8f0e8]/30 rounded-xl">
                    <span class="text-4xl block mb-2">🌪️</span>
                    No chase logs yet. Write one down!
                  </div>
                }

                @for (log of logs; track log.id) {
                  <div class="p-5 border-2 border-dashed border-[#e8f0e8]/40 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors relative group">
                    <div class="flex justify-between items-start gap-4 mb-2">
                      <h4 class="text-2xl font-bold text-[#fffdcc]">{{ log.title }}</h4>
                      <div class="flex items-center gap-2">
                        @if (log.efRating !== null && log.efRating !== undefined) {
                          <span class="px-2 py-1 text-sm font-bold border-2 border-dashed border-[#ffaaaa] text-[#ffaaaa] rounded rotate-3">EF{{ log.efRating }}</span>
                        }
                        <button (click)="deleteChaseLog(log.id)" class="opacity-0 group-hover:opacity-100 text-[#ffaaaa] hover:text-[#ff5555] transition-opacity ml-2" title="Erase Log">✕</button>
                      </div>
                    </div>
                    
                    <div class="flex flex-wrap gap-4 text-sm opacity-90 mb-3 border-b-2 border-dashed border-[#e8f0e8]/20 pb-3">
                      <span>📅 {{ formatDate(log.chaseDate) }}</span>
                      <span>📍 {{ log.state }}</span>
                      <span>🚗 {{ log.milesDriven }} miles</span>
                    </div>

                    @if (log.notes) {
                      <div class="text-base opacity-80 leading-relaxed whitespace-pre-line">
                        {{ log.notes }}
                      </div>
                    }
                  </div>
                }
              }
            </div>
          </div>
        }

      </div>
    </div>
  `,
  styles: [`
    input, select, textarea {
      font-family: inherit;
    }
  `]
})
export class ArchiveComponent implements OnInit {
  private weatherService = inject(WeatherService);

  activeTab: 'nws' | 'chase' = 'nws';
  
  // NWS Archive State
  private refreshHistoryTrigger = new BehaviorSubject<void>(undefined);
  history$: Observable<TrackerIncident[]> = this.refreshHistoryTrigger.pipe(
    switchMap(() => this.weatherService.getHistory(this.filters))
  );
  
  filters = {
    search: '',
    severity: '',
    category: '',
    tornadoOnly: false
  };

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

  deleteHistory(id: string) {
    if (confirm('Erase this alert from the chalkboard?')) {
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

    // Ensure date is ISO8601 string for backend
    const logToSubmit = {
      ...this.newChaseLog,
      chaseDate: new Date(this.newChaseLog.chaseDate).toISOString()
    };

    this.weatherService.createChaseLog(logToSubmit).subscribe(() => {
      // Reset form
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
    if (confirm('Erase this chase log from the chalkboard?')) {
      this.weatherService.deleteChaseLog(id).subscribe(() => this.loadChaseLogs());
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
