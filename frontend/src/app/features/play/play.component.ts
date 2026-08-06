import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { OpsStateService } from '../../core/ops-state.service';
import { QuizAttempt, QuizAward, WeatherService } from '../../core/weather.service';
import {
  QUIZ_TRACKS,
  QuizCategory,
  QuizQuestion,
  QuizTrack,
  expertRank,
  questionsFor,
} from './play.questions';
import { ChaseGameComponent } from './chase-game.component';

interface TrackProgress {
  bestPercent: number;
  bestScore: number;
  bestTotal: number;
  plays: number;
}

type View = 'hub' | 'quiz' | 'results' | 'chase';

const STORAGE_KEY = 'ww-play-progress-v1';
const CALLSIGN_KEY = 'ww-play-callsign';

@Component({
  selector: 'app-play',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ChaseGameComponent],
  template: `
    <div class="min-h-[calc(100vh-4rem)] p-4 md:p-6">
      <div class="mx-auto" [class.max-w-3xl]="view !== 'chase'" [class.max-w-5xl]="view === 'chase'">

        @if (view === 'hub') {
          <div class="mb-6 md:mb-8">
            <p class="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2">Storm Expert Training</p>
            <h1 class="text-3xl md:text-4xl font-black text-white italic uppercase tracking-wider font-sans">
              Prove Your Skills
            </h1>
            <p class="text-base-content/60 text-sm font-semibold mt-2 max-w-xl">
              Big buttons. Clear choices. Real chase knowledge. Pick a track and show what you know.
            </p>

            <label class="storm-card mt-4 p-3 flex flex-col sm:flex-row sm:items-center gap-2 block">
              <span class="text-[10px] font-black uppercase tracking-widest text-base-content/45 shrink-0">Your callsign</span>
              <input
                type="text"
                maxlength="32"
                [(ngModel)]="callsign"
                (ngModelChange)="saveCallsign()"
                placeholder="Storm Expert"
                class="input input-sm input-bordered bg-base-200/80 border-base-300 rounded-lg font-bold w-full"
              >
            </label>

            @if (auth.user(); as u) {
              <div class="mt-3 storm-card px-4 py-3 space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <div>
                    <div class="text-[10px] uppercase tracking-widest text-base-content/40 font-bold">Chaser level</div>
                    <div class="font-black text-primary text-lg leading-tight">
                      Level {{ u.level }} · {{ u.levelTitle }}
                    </div>
                  </div>
                  <div class="text-right text-[10px] font-black uppercase tracking-wider text-accent tabular-nums">
                    {{ u.xpIntoLevel }}/{{ u.xpForNext }} XP
                  </div>
                </div>
                <div class="h-2 rounded-full bg-base-300 overflow-hidden">
                  <div
                    class="h-full bg-primary transition-all duration-500"
                    [style.width.%]="xpBarPct(u.xpIntoLevel, u.xpForNext)"
                  ></div>
                </div>
                <p class="text-xs text-base-content/55 font-semibold">
                  Quiz runs earn XP. Level up to unlock chase trucks in your garage.
                </p>
              </div>
            } @else if (overallRank) {
              <div class="mt-3 storm-card px-4 py-3">
                <div class="text-[10px] uppercase tracking-widest text-base-content/40 font-bold">Your rank</div>
                <div class="font-black text-primary text-lg leading-tight">{{ overallRank.title }}</div>
                <div class="text-xs text-base-content/55 font-semibold">{{ overallRank.blurb }}</div>
              </div>
            }
          </div>

          <button
            type="button"
            class="storm-card w-full text-left p-4 mb-3 hover:border-accent/50 transition-colors group"
            (click)="openChase()"
          >
            <div class="flex items-start gap-3">
              <div class="min-w-0 flex-1">
                <p class="text-[10px] font-black uppercase tracking-widest text-accent mb-1">Shared world · lobbies</p>
                <h2 class="font-black uppercase italic text-white text-lg leading-tight group-hover:text-accent transition-colors">
                  Storm World
                </h2>
                <p class="text-xs text-base-content/55 font-semibold mt-1">
                  Pick a lobby shard, then drive the Maine corridor. Land cover biases what you find.
                </p>
              </div>
              <span class="text-base-content/30 text-sm self-center">▶</span>
            </div>
          </button>

          <a
            routerLink="/trade"
            class="storm-card w-full text-left p-4 mb-3 hover:border-primary/50 transition-colors group block"
          >
            <div class="flex items-start gap-3">
              <div class="min-w-0 flex-1">
                <p class="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Craft · Trade</p>
                <h2 class="font-black uppercase italic text-white text-lg leading-tight group-hover:text-primary transition-colors">
                  Trade Center
                </h2>
                <p class="text-xs text-base-content/55 font-semibold mt-1">
                  Craft probes and kits from field scrap. List or buy packs — server checks every trade.
                </p>
              </div>
              <span class="text-base-content/30 text-sm self-center">▶</span>
            </div>
          </a>

          <div class="grid gap-3 sm:grid-cols-2">
            @for (track of tracks; track track.id) {
              <button
                type="button"
                class="storm-card text-left p-4 min-h-[7.5rem] hover:border-primary/50 transition-colors group"
                (click)="startTrack(track)"
              >
                <div class="flex items-start gap-3">
                  <span class="text-3xl shrink-0" aria-hidden="true">{{ track.icon }}</span>
                  <div class="min-w-0 flex-1">
                    <h2 class="font-black uppercase italic text-white text-lg leading-tight group-hover:text-primary transition-colors">
                      {{ track.title }}
                    </h2>
                    <p class="text-xs text-base-content/55 font-semibold mt-1">{{ track.subtitle }}</p>
                    @if (progress[track.id]; as p) {
                      <p class="text-[10px] font-black uppercase tracking-wider text-accent mt-2">
                        Best {{ p.bestScore }}/{{ p.bestTotal }} · {{ p.bestPercent }}%
                      </p>
                    } @else {
                      <p class="text-[10px] font-black uppercase tracking-wider text-base-content/35 mt-2">
                        Not attempted yet
                      </p>
                    }
                  </div>
                  <span class="text-base-content/30 text-sm self-center">▶</span>
                </div>
              </button>
            }
          </div>

          <article class="storm-card mt-4 p-4">
            <div class="flex items-center justify-between gap-2 mb-3">
              <h2 class="text-xs font-black uppercase tracking-widest text-secondary">Top Experts</h2>
              <button
                type="button"
                class="btn btn-ghost btn-xs font-bold uppercase"
                (click)="loadLeaderboard()"
              >Refresh</button>
            </div>
            @if (leaderboard.length === 0) {
              <p class="text-xs text-base-content/50 font-semibold">No scores posted yet — be the first on the board.</p>
            } @else {
              <ol class="space-y-2">
                @for (row of leaderboard; track row.id; let i = $index) {
                  <li class="flex items-center gap-3 text-sm">
                    <span class="font-black text-primary w-6">{{ i + 1 }}</span>
                    <span class="font-bold text-white flex-1 truncate">{{ row.playerName }}</span>
                    <span class="text-[10px] uppercase tracking-wider text-base-content/40 font-bold">{{ trackLabel(row.category) }}</span>
                    <span class="font-black text-accent tabular-nums">{{ row.score }}/{{ row.total }}</span>
                  </li>
                }
              </ol>
            }
          </article>

          <a
            routerLink="/archive"
            class="storm-card mt-3 p-4 flex items-center gap-3 hover:border-secondary/40 transition-colors block"
          >
            <div class="flex-1 min-w-0">
              <div class="font-black uppercase italic text-sm text-white">Chase Reports</div>
              <p class="text-xs text-base-content/50 font-semibold">
                Log real intercepts in Archive
              </p>
            </div>
            <span class="text-base-content/30 text-sm">→</span>
          </a>
        }

        @if (view === 'chase') {
          <app-chase-game (exit)="backToHub()"></app-chase-game>
        }

        @if (view === 'quiz' && activeTrack && current) {
          <div class="mb-4 flex items-center gap-3">
            <button
              type="button"
              class="btn btn-ghost btn-sm rounded-xl font-black uppercase text-[10px] min-h-11 border border-base-300"
              (click)="backToHub()"
            >
              ← Exit
            </button>
            <div class="flex-1 min-w-0">
              <div class="text-[10px] font-black uppercase tracking-widest text-base-content/40">
                {{ activeTrack.title }} · {{ index + 1 }} / {{ deck.length }}
              </div>
              <div class="h-2 rounded-full bg-base-300/60 mt-1 overflow-hidden">
                <div
                  class="h-full bg-primary transition-all duration-300 rounded-full"
                  [style.width.%]="progressPct"
                ></div>
              </div>
            </div>
          </div>

          <article class="storm-card p-4 md:p-6 space-y-4">
            <h2 class="text-xl md:text-2xl font-black text-white leading-snug">
              {{ current.prompt }}
            </h2>

            @if (current.diagram) {
              <div class="rounded-xl border border-base-300 bg-base-300/30 p-3 flex justify-center" aria-hidden="true">
                <ng-container [ngSwitch]="current.diagram">
                  <svg *ngSwitchCase="'hook'" viewBox="0 0 200 120" class="w-full max-w-xs h-28">
                    <rect width="200" height="120" rx="8" fill="#0f172a"/>
                    <circle cx="110" cy="58" r="36" fill="#22c55e" opacity="0.35"/>
                    <circle cx="110" cy="58" r="22" fill="#ef4444" opacity="0.55"/>
                    <path d="M78 70 C60 90 55 95 70 100 C95 108 120 95 125 78" fill="none" stroke="#f97316" stroke-width="8" stroke-linecap="round"/>
                    <text x="12" y="20" fill="#94a3b8" font-size="11" font-family="sans-serif">HOOK</text>
                  </svg>
                  <svg *ngSwitchCase="'couplet'" viewBox="0 0 200 120" class="w-full max-w-xs h-28">
                    <rect width="200" height="120" rx="8" fill="#0f172a"/>
                    <circle cx="85" cy="60" r="28" fill="#22c55e" opacity="0.7"/>
                    <circle cx="115" cy="60" r="28" fill="#ef4444" opacity="0.7"/>
                    <text x="12" y="20" fill="#94a3b8" font-size="11" font-family="sans-serif">VELOCITY</text>
                    <text x="70" y="105" fill="#86efac" font-size="10" font-family="sans-serif">IN</text>
                    <text x="118" y="105" fill="#fca5a5" font-size="10" font-family="sans-serif">OUT</text>
                  </svg>
                  <svg *ngSwitchCase="'core'" viewBox="0 0 200 120" class="w-full max-w-xs h-28">
                    <rect width="200" height="120" rx="8" fill="#0f172a"/>
                    <circle cx="100" cy="60" r="40" fill="#86efac" opacity="0.3"/>
                    <circle cx="100" cy="60" r="28" fill="#f97316" opacity="0.5"/>
                    <circle cx="100" cy="60" r="14" fill="#f472b6" opacity="0.85"/>
                    <text x="12" y="20" fill="#94a3b8" font-size="11" font-family="sans-serif">CORE</text>
                  </svg>
                  <svg *ngSwitchCase="'watch'" viewBox="0 0 200 120" class="w-full max-w-xs h-28">
                    <rect width="200" height="120" rx="8" fill="#0f172a"/>
                    <rect x="40" y="35" width="120" height="50" rx="8" fill="#eab308" opacity="0.85"/>
                    <text x="70" y="66" fill="#0f172a" font-size="18" font-weight="700" font-family="sans-serif">WATCH</text>
                  </svg>
                  <svg *ngSwitchCase="'warning'" viewBox="0 0 200 120" class="w-full max-w-xs h-28">
                    <rect width="200" height="120" rx="8" fill="#0f172a"/>
                    <rect x="30" y="35" width="140" height="50" rx="8" fill="#ef4444" opacity="0.9"/>
                    <text x="55" y="66" fill="#fff" font-size="16" font-weight="700" font-family="sans-serif">WARNING</text>
                  </svg>
                  <svg *ngSwitchCase="'ef0'" viewBox="0 0 200 120" class="w-full max-w-xs h-28">
                    <rect width="200" height="120" rx="8" fill="#0f172a"/>
                    <rect x="60" y="50" width="80" height="45" fill="#64748b"/>
                    <polygon points="60,50 100,25 140,50" fill="#94a3b8"/>
                    <line x1="150" y1="40" x2="170" y2="55" stroke="#fbbf24" stroke-width="3"/>
                    <text x="12" y="20" fill="#94a3b8" font-size="11" font-family="sans-serif">LIGHT DAMAGE</text>
                  </svg>
                  <svg *ngSwitchCase="'ef2'" viewBox="0 0 200 120" class="w-full max-w-xs h-28">
                    <rect width="200" height="120" rx="8" fill="#0f172a"/>
                    <rect x="50" y="55" width="70" height="40" fill="#64748b"/>
                    <polygon points="50,55 85,20 120,55" fill="#94a3b8" opacity="0.5"/>
                    <path d="M130 90 L145 40 L160 90" fill="none" stroke="#22c55e" stroke-width="4"/>
                    <text x="12" y="20" fill="#94a3b8" font-size="11" font-family="sans-serif">SERIOUS DAMAGE</text>
                  </svg>
                  <svg *ngSwitchCase="'ef4'" viewBox="0 0 200 120" class="w-full max-w-xs h-28">
                    <rect width="200" height="120" rx="8" fill="#0f172a"/>
                    <rect x="55" y="85" width="90" height="10" fill="#475569"/>
                    <line x1="70" y1="85" x2="60" y2="50" stroke="#94a3b8" stroke-width="3"/>
                    <line x1="130" y1="85" x2="145" y2="45" stroke="#94a3b8" stroke-width="3"/>
                    <text x="12" y="20" fill="#f472b6" font-size="11" font-family="sans-serif">WIPED CLEAN</text>
                  </svg>
                  <svg *ngSwitchCase="'shelf'" viewBox="0 0 200 120" class="w-full max-w-xs h-28">
                    <rect width="200" height="120" rx="8" fill="#0f172a"/>
                    <path d="M20 80 Q70 30 120 55 T190 40 L190 100 L20 100 Z" fill="#64748b" opacity="0.8"/>
                    <text x="12" y="20" fill="#94a3b8" font-size="11" font-family="sans-serif">SHELF CLOUD</text>
                  </svg>
                </ng-container>
              </div>
            }

            <div class="grid gap-2">
              @for (choice of current.choices; track choice.id) {
                <button
                  type="button"
                  class="btn btn-lg justify-start gap-3 min-h-16 rounded-2xl font-bold text-left border-2 normal-case"
                  [disabled]="answered"
                  [ngClass]="choiceButtonClass(choice.id)"
                  (click)="pick(choice.id)"
                >
                  @if (choice.icon) {
                    <span class="text-2xl shrink-0" aria-hidden="true">{{ choice.icon }}</span>
                  }
                  <span class="flex-1 text-base md:text-lg leading-snug">{{ choice.label }}</span>
                </button>
              }
            </div>

            @if (answered) {
              <div
                class="rounded-xl border p-4"
                [ngClass]="lastCorrect
                  ? 'border-success/40 bg-success/10'
                  : 'border-warning/40 bg-warning/10'"
              >
                <div class="font-black uppercase tracking-wider text-sm mb-1"
                  [ngClass]="lastCorrect ? 'text-success' : 'text-warning'">
                  {{ lastCorrect ? 'Expert call' : 'Almost — here’s the pro tip' }}
                </div>
                <p class="text-sm font-semibold text-base-content/80 leading-relaxed">
                  {{ feedback }}
                </p>
                <button
                  type="button"
                  class="btn btn-primary btn-sm mt-3 rounded-xl font-black uppercase tracking-wider min-h-11"
                  (click)="next()"
                >
                  {{ index + 1 >= deck.length ? 'See results' : 'Next question' }}
                </button>
              </div>
            }
          </article>
        }

        @if (view === 'results' && activeTrack) {
          <div class="storm-card p-6 text-center space-y-4">
            <p class="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Mission complete</p>
            <h2 class="text-3xl font-black text-white italic uppercase">{{ resultRank.title }}</h2>
            <p class="text-base-content/60 font-semibold">{{ resultRank.blurb }}</p>
            <div class="text-5xl font-black text-primary py-2">
              {{ score }}<span class="text-2xl text-base-content/40">/{{ deck.length }}</span>
            </div>
            <p class="text-sm font-bold text-accent uppercase tracking-widest">
              {{ percent }}% · {{ activeTrack.badge }} track
            </p>
            @if (postedToBoard) {
              <p class="text-xs font-bold text-success uppercase tracking-wider">Posted to Top Experts</p>
            }
            @if (lastAward) {
              <div class="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 space-y-1">
                <p class="text-sm font-black text-accent uppercase tracking-wider">
                  +{{ lastAward.xpGained }} XP
                  @if (lastAward.levelUp) {
                    <span class="text-primary"> · Level up! Now {{ lastAward.level }}</span>
                  }
                </p>
                <p class="text-xs font-semibold text-base-content/60">
                  {{ lastAward.title }} · {{ lastAward.xpIntoLevel }}/{{ lastAward.xpForNext }} to next level
                </p>
              </div>
            }
            @if (unlockedKeys.length) {
              <p class="text-xs font-bold text-secondary uppercase tracking-wider">
                Garage unlock: {{ unlockedKeys.join(', ') }}
              </p>
            }
            @if (!auth.isLoggedIn()) {
              <div class="rounded-xl border border-primary/40 bg-primary/10 p-4 text-left space-y-2">
                <p class="text-sm font-black text-white uppercase italic">Save this run</p>
                <p class="text-xs text-base-content/60 font-semibold">
                  Create a chaser profile to keep XP, level up, unlock chase trucks, and open your live dashboard.
                </p>
                <button
                  type="button"
                  class="btn btn-primary btn-sm rounded-xl font-black uppercase min-h-11"
                  (click)="promptRegister()"
                >
                  Create profile / log in
                </button>
              </div>
            }
            <div class="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <button
                type="button"
                class="btn btn-primary rounded-xl font-black uppercase tracking-wider min-h-12"
                (click)="startTrack(activeTrack)"
              >
                Run it again
              </button>
              <button
                type="button"
                class="btn btn-ghost border border-base-300 rounded-xl font-black uppercase tracking-wider min-h-12"
                (click)="backToHub()"
              >
                All tracks
              </button>
            </div>
          </div>
        }

      </div>
    </div>
  `,
})
export class PlayComponent implements OnInit {
  private readonly weather = inject(WeatherService);
  readonly auth = inject(AuthService);
  private readonly ops = inject(OpsStateService);

  readonly tracks = QUIZ_TRACKS;

  view: View = 'hub';
  activeTrack: QuizTrack | null = null;
  deck: QuizQuestion[] = [];
  index = 0;
  score = 0;
  answered = false;
  lastCorrect = false;
  feedback = '';
  selectedId: string | null = null;
  progress: Partial<Record<QuizCategory, TrackProgress>> = {};
  overallRank: { title: string; blurb: string } | null = null;
  callsign = 'Storm Expert';
  leaderboard: QuizAttempt[] = [];
  postedToBoard = false;
  unlockedKeys: string[] = [];
  lastAward: QuizAward | null = null;
  private startedAt = 0;
  private lastSeconds = 0;

  get current(): QuizQuestion | null {
    return this.deck[this.index] ?? null;
  }

  get progressPct(): number {
    if (!this.deck.length) return 0;
    return Math.round(((this.index + (this.answered ? 1 : 0)) / this.deck.length) * 100);
  }

  get percent(): number {
    if (!this.deck.length) return 0;
    return Math.round((this.score / this.deck.length) * 100);
  }

  get resultRank(): { title: string; blurb: string } {
    return expertRank(this.percent);
  }

  ngOnInit(): void {
    this.loadProgress();
    this.loadCallsign();
    this.loadLeaderboard();
    if (this.auth.user()) {
      this.callsign = this.auth.user()!.chaserName;
    }
  }

  promptRegister(): void {
    if (!this.activeTrack) return;
    this.auth.pendingQuiz = {
      category: this.activeTrack.id,
      score: this.score,
      total: this.deck.length,
      seconds: this.lastSeconds || 1,
      playerName: this.callsign || 'Storm Expert',
    };
    this.auth.openModal('signup');
  }

  saveCallsign(): void {
    const cleaned = (this.callsign || '').trim().slice(0, 32) || 'Storm Expert';
    this.callsign = cleaned;
    try {
      localStorage.setItem(CALLSIGN_KEY, cleaned);
    } catch { /* ignore */ }
  }

  loadLeaderboard(): void {
    this.weather.getQuizLeaderboard().subscribe(rows => {
      this.leaderboard = rows || [];
    });
  }

  trackLabel(category: string): string {
    return this.tracks.find(t => t.id === category)?.title || category;
  }

  startTrack(track: QuizTrack): void {
    this.activeTrack = track;
    this.deck = this.shuffle(questionsFor(track.id));
    this.index = 0;
    this.score = 0;
    this.answered = false;
    this.selectedId = null;
    this.feedback = '';
    this.postedToBoard = false;
    this.startedAt = Date.now();
    this.view = 'quiz';
  }

  openChase(): void {
    this.view = 'chase';
    this.activeTrack = null;
    this.deck = [];
  }

  backToHub(): void {
    this.view = 'hub';
    this.activeTrack = null;
    this.deck = [];
    this.refreshOverallRank();
    this.loadLeaderboard();
  }

  pick(choiceId: string): void {
    if (this.answered || !this.current) return;
    this.selectedId = choiceId;
    this.answered = true;
    this.lastCorrect = choiceId === this.current.correctId;
    if (this.lastCorrect) {
      this.score++;
      this.feedback = this.current.explainCorrect;
    } else {
      this.feedback = this.current.explainWrong;
    }
  }

  next(): void {
    if (this.index + 1 >= this.deck.length) {
      this.finish();
      return;
    }
    this.index++;
    this.answered = false;
    this.selectedId = null;
    this.feedback = '';
  }

  choiceButtonClass(choiceId: string): string {
    if (!this.answered) {
      return 'btn-ghost border-base-300 bg-base-200/40 hover:border-primary hover:bg-primary/10';
    }
    const correct = this.current?.correctId === choiceId;
    const picked = this.selectedId === choiceId;
    if (correct) return 'btn-success border-success text-success-content';
    if (picked) return 'btn-warning border-warning text-warning-content opacity-90';
    return 'btn-ghost border-base-300 opacity-40';
  }

  private finish(): void {
    if (!this.activeTrack) return;
    const cat = this.activeTrack.id;
    const percent = this.percent;
    const prev = this.progress[cat];
    const next: TrackProgress = {
      bestPercent: Math.max(prev?.bestPercent ?? 0, percent),
      bestScore: percent >= (prev?.bestPercent ?? -1) ? this.score : (prev?.bestScore ?? this.score),
      bestTotal: this.deck.length,
      plays: (prev?.plays ?? 0) + 1,
    };
    if (prev && percent < prev.bestPercent) {
      next.bestScore = prev.bestScore;
      next.bestTotal = prev.bestTotal;
    }
    this.progress = { ...this.progress, [cat]: next };
    this.saveProgress();
    this.view = 'results';
    this.unlockedKeys = [];
    this.lastAward = null;

    const seconds = Math.max(1, Math.round((Date.now() - this.startedAt) / 1000));
    this.lastSeconds = seconds;
    const playerName = this.auth.user()?.chaserName || this.callsign || 'Storm Expert';
    this.weather.saveQuizAttempt({
      playerName,
      category: cat,
      score: this.score,
      total: this.deck.length,
      seconds,
    }).subscribe(res => {
      if (res?.attempt?.id) {
        this.postedToBoard = true;
        this.unlockedKeys = res.unlocked || [];
        this.lastAward = res.award ?? null;
        this.loadLeaderboard();
        if (this.auth.isLoggedIn()) {
          this.auth.refreshMe().subscribe(() => this.ops.reloadAccountData());
        }
      }
    });
  }

  xpBarPct(into: number, need: number): number {
    if (!need || need <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((into / need) * 100)));
  }

  private loadCallsign(): void {
    try {
      const saved = localStorage.getItem(CALLSIGN_KEY);
      if (saved) this.callsign = saved;
    } catch { /* ignore */ }
  }

  private loadProgress(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.progress = JSON.parse(raw);
    } catch {
      this.progress = {};
    }
    this.refreshOverallRank();
  }

  private saveProgress(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch { /* ignore */ }
    this.refreshOverallRank();
  }

  private refreshOverallRank(): void {
    const vals = Object.values(this.progress);
    if (!vals.length) {
      this.overallRank = null;
      return;
    }
    const avg = Math.round(vals.reduce((s, p) => s + p.bestPercent, 0) / vals.length);
    this.overallRank = expertRank(avg);
  }

  private shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
