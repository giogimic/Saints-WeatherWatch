import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { TradeListing, WorldItem, WorldRecipe, WorldService } from '../../../core/world.service';
import { ItemIconComponent } from '../item-icon/item-icon.component';

type Overlay = 'none' | 'bag' | 'market';
type MarketTab = 'buy' | 'sell';

@Component({
  selector: 'app-bag-market-dock',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ItemIconComponent],
  template: `
    @if (auth.isLoggedIn()) {
      <div class="fixed z-[70] flex flex-col gap-2 items-end pointer-events-none
                  bottom-24 right-3 md:bottom-6 md:right-5">
        <div class="pointer-events-auto flex gap-2">
          <button
            type="button"
            class="bag-fab storm-card flex flex-col items-center justify-center gap-0.5 w-[4.25rem] h-[4.25rem] rounded-2xl border-2 border-amber-700/60 bg-amber-950/90 text-amber-100 hover:bg-amber-900/90 transition-colors"
            (click)="open('bag')"
            title="Bag"
          >
            <svg viewBox="0 0 48 48" class="w-9 h-9" aria-hidden="true">
              <path d="M12 18h24l-2 22H14z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
              <path d="M18 18c0-5 3-9 6-9s6 4 6 9" fill="none" stroke="currentColor" stroke-width="2.2"/>
              <ellipse cx="24" cy="18" rx="11" ry="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/>
              <circle cx="24" cy="28" r="5.5" fill="#1a1208" stroke="currentColor" stroke-width="1.6"/>
              <text x="24" y="31.2" text-anchor="middle" font-size="6.5" font-weight="800" fill="#f5d78e" font-family="serif">BAG</text>
            </svg>
            <span class="text-[9px] font-black uppercase tracking-widest">Bag</span>
          </button>

          <button
            type="button"
            class="bag-fab storm-card flex flex-col items-center justify-center gap-0.5 w-[4.25rem] h-[4.25rem] rounded-2xl border-2 border-sky-600/50 bg-slate-900/90 text-sky-100 hover:bg-slate-800/90 transition-colors"
            (click)="open('market')"
            title="Storm Market"
          >
            <svg viewBox="0 0 48 48" class="w-9 h-9" aria-hidden="true">
              <path d="M8 20h32v18H8z" fill="none" stroke="currentColor" stroke-width="2.2"/>
              <path d="M6 20l6-8h24l6 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
              <path d="M16 20v18M32 20v18M8 28h32" stroke="currentColor" stroke-width="1.5" opacity="0.7"/>
              <circle cx="24" cy="14" r="3" fill="currentColor"/>
            </svg>
            <span class="text-[8px] font-black uppercase tracking-wider leading-tight text-center px-0.5">Storm Market</span>
          </button>
        </div>
        <div class="pointer-events-none text-[10px] font-black tabular-nums text-amber-200/90 bg-black/50 px-2 py-1 rounded-lg border border-amber-700/40">
          {{ credits() }} ₡
        </div>
      </div>
    }

    @if (overlay() !== 'none') {
      <div class="fixed inset-0 z-[80] bg-black/65 backdrop-blur-[2px]" (click)="close()"></div>
      <div class="fixed inset-x-3 top-[8%] bottom-[12%] md:inset-auto md:top-[8%] md:bottom-[8%] md:left-1/2 md:-translate-x-1/2 md:w-[min(42rem,94vw)] z-[81] storm-card flex flex-col overflow-hidden border-2 border-base-300">
        <div class="flex items-center gap-3 px-4 py-3 border-b border-base-300/60 shrink-0">
          <div class="min-w-0 flex-1">
            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
              {{ overlay() === 'bag' ? 'Loot bag' : 'Storm Market' }}
            </p>
            <h2 class="text-lg font-black text-white italic uppercase truncate">
              {{ overlay() === 'bag' ? 'Your packs' : 'Buy · Sell · Vendor' }}
            </h2>
          </div>
          <div class="text-sm font-black tabular-nums text-amber-200">{{ credits() }} ₡</div>
          <button type="button" class="btn btn-ghost btn-sm rounded-xl font-black" (click)="close()" aria-label="Close">✕</button>
        </div>

        @if (overlay() === 'bag') {
          <div class="flex-1 overflow-y-auto p-3 space-y-2">
            @if (busy()) {
              <p class="text-xs font-bold text-base-content/50 uppercase tracking-widest text-center py-8">Loading…</p>
            } @else if (!items().length) {
              <p class="text-sm font-semibold text-base-content/55 text-center py-10">
                Empty — bag drops in Storm World or buy from the vendor.
              </p>
            } @else {
              <ul class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                @for (it of items(); track it.key) {
                  <li class="rounded-xl border border-base-300/50 bg-base-300/20 p-2.5 flex flex-col gap-1.5">
                    <div class="w-10 h-10 text-amber-100/90">
                      <app-item-icon [itemKey]="it.key" />
                    </div>
                    <div class="font-black text-white text-xs leading-snug truncate" [title]="it.name">{{ it.name }}</div>
                    <div class="flex justify-between text-[10px] font-bold uppercase tracking-wider text-base-content/50">
                      <span>×{{ it.count || 0 }}</span>
                      <span class="text-amber-200/80">{{ it.vendorBuy || it.value || 0 }} ₡</span>
                    </div>
                  </li>
                }
              </ul>
            }
            <div class="pt-2 flex flex-wrap gap-2">
              <button type="button" class="btn btn-sm btn-ghost border border-base-300 rounded-xl font-black uppercase" (click)="reload()">Refresh</button>
              <a routerLink="/trade" class="btn btn-sm btn-primary rounded-xl font-black uppercase" (click)="close()">Craft bench</a>
            </div>
          </div>
        }

        @if (overlay() === 'market') {
          <div class="flex gap-1 px-3 pt-3 shrink-0">
            <button
              type="button"
              class="btn btn-sm flex-1 rounded-xl font-black uppercase"
              [ngClass]="marketTab() === 'buy' ? 'btn-primary' : 'btn-ghost border border-base-300'"
              (click)="marketTab.set('buy')"
            >Buy</button>
            <button
              type="button"
              class="btn btn-sm flex-1 rounded-xl font-black uppercase"
              [ngClass]="marketTab() === 'sell' ? 'btn-primary' : 'btn-ghost border border-base-300'"
              (click)="marketTab.set('sell')"
            >Sell</button>
          </div>

          <div class="flex-1 overflow-y-auto p-3 space-y-4">
            @if (msg()) {
              <p class="text-xs font-bold" [class.text-success]="msgOk()" [class.text-error]="!msgOk()">{{ msg() }}</p>
            }

            @if (marketTab() === 'buy') {
              <section class="space-y-2">
                <h3 class="text-[10px] font-black uppercase tracking-widest text-sky-300">Vendor stock</h3>
                <p class="text-[10px] text-base-content/45 font-semibold">NPC shop · commons & gear at list price. Pace yourself — market is rate-limited.</p>
                <ul class="space-y-1.5">
                  @for (it of vendor(); track it.key) {
                    <li class="flex items-center gap-2 rounded-xl border border-base-300/40 px-2.5 py-2">
                      <div class="w-8 h-8 text-sky-200 shrink-0"><app-item-icon [itemKey]="it.key" /></div>
                      <div class="min-w-0 flex-1">
                        <div class="font-black text-white text-xs truncate">{{ it.name }}</div>
                        <div class="text-[10px] font-bold text-amber-200/80">{{ it.price || it.vendorSell || it.value }} ₡</div>
                      </div>
                      <input type="number" min="1" max="25" class="input input-xs input-bordered w-14 font-bold" [(ngModel)]="buyQty[it.key]" />
                      <button type="button" class="btn btn-primary btn-xs rounded-lg font-black uppercase min-h-9" [disabled]="acting()" (click)="buyVendor(it)">Buy</button>
                    </li>
                  }
                </ul>
              </section>

              <section class="space-y-2">
                <h3 class="text-[10px] font-black uppercase tracking-widest text-accent">Player listings</h3>
                <ul class="space-y-1.5">
                  @for (t of trades(); track t.id) {
                    <li class="flex flex-wrap items-center gap-2 rounded-xl border border-base-300/40 px-2.5 py-2 text-xs">
                      <div class="w-7 h-7 text-amber-100"><app-item-icon [itemKey]="t.offerKey" /></div>
                      <span class="font-bold text-white flex-1 min-w-[8rem]">
                        {{ t.offerQty }}× {{ label(t.offerKey) }}
                        <span class="text-base-content/40">for</span>
                        {{ t.askQty }}× {{ label(t.askKey) }}
                      </span>
                      @if (t.sellerId === auth.user()?.id) {
                        <button type="button" class="btn btn-ghost btn-xs font-black uppercase" [disabled]="acting()" (click)="cancelListing(t.id)">Cancel</button>
                      } @else {
                        <button type="button" class="btn btn-secondary btn-xs font-black uppercase" [disabled]="acting()" (click)="buyListing(t.id)">Barter</button>
                      }
                    </li>
                  } @empty {
                    <li class="text-xs text-base-content/50 font-semibold">No open player listings.</li>
                  }
                </ul>
              </section>
            }

            @if (marketTab() === 'sell') {
              <section class="space-y-2">
                <h3 class="text-[10px] font-black uppercase tracking-widest text-amber-200">Sell to vendor</h3>
                <p class="text-[10px] text-base-content/45 font-semibold">Vendor pays ~65% of base value. Max 25 per sale.</p>
                <ul class="space-y-1.5">
                  @for (it of items(); track it.key) {
                    <li class="flex items-center gap-2 rounded-xl border border-base-300/40 px-2.5 py-2">
                      <div class="w-8 h-8 text-amber-100 shrink-0"><app-item-icon [itemKey]="it.key" /></div>
                      <div class="min-w-0 flex-1">
                        <div class="font-black text-white text-xs truncate">{{ it.name }} ×{{ it.count }}</div>
                        <div class="text-[10px] font-bold text-amber-200/80">{{ it.vendorBuy || 0 }} ₡ each</div>
                      </div>
                      <input type="number" min="1" [max]="it.count || 1" class="input input-xs input-bordered w-14 font-bold" [(ngModel)]="sellQty[it.key]" />
                      <button type="button" class="btn btn-warning btn-xs rounded-lg font-black uppercase min-h-9" [disabled]="acting()" (click)="sellVendor(it)">Sell</button>
                    </li>
                  } @empty {
                    <li class="text-xs text-base-content/50 font-semibold">Nothing to sell — fill your bag first.</li>
                  }
                </ul>
              </section>

              <section class="space-y-2 border-t border-base-300/40 pt-3">
                <h3 class="text-[10px] font-black uppercase tracking-widest text-secondary">List barter (player market)</h3>
                <div class="grid sm:grid-cols-2 gap-2">
                  <label class="text-[10px] font-bold uppercase tracking-wider text-base-content/45">
                    Offer
                    <select class="select select-sm select-bordered w-full mt-1 font-semibold" [(ngModel)]="offerKey">
                      @for (it of items(); track it.key) {
                        <option [value]="it.key">{{ it.name }} (×{{ it.count }})</option>
                      }
                    </select>
                  </label>
                  <label class="text-[10px] font-bold uppercase tracking-wider text-base-content/45">
                    Offer qty
                    <input type="number" min="1" max="20" class="input input-sm input-bordered w-full mt-1 font-semibold" [(ngModel)]="offerQty">
                  </label>
                  <label class="text-[10px] font-bold uppercase tracking-wider text-base-content/45">
                    Ask for
                    <select class="select select-sm select-bordered w-full mt-1 font-semibold" [(ngModel)]="askKey">
                      @for (it of catalog(); track it.key) {
                        <option [value]="it.key">{{ it.name }}</option>
                      }
                    </select>
                  </label>
                  <label class="text-[10px] font-bold uppercase tracking-wider text-base-content/45">
                    Ask qty
                    <input type="number" min="1" max="20" class="input input-sm input-bordered w-full mt-1 font-semibold" [(ngModel)]="askQty">
                  </label>
                </div>
                <button type="button" class="btn btn-secondary btn-sm rounded-xl font-black uppercase min-h-11" [disabled]="acting() || !offerKey" (click)="listTrade()">
                  List barter
                </button>
              </section>
            }
          </div>
        }
      </div>
    }
  `,
})
export class BagMarketDockComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly world = inject(WorldService);

  readonly overlay = signal<Overlay>('none');
  readonly marketTab = signal<MarketTab>('buy');
  readonly items = signal<WorldItem[]>([]);
  readonly catalog = signal<WorldItem[]>([]);
  readonly vendor = signal<WorldItem[]>([]);
  readonly trades = signal<TradeListing[]>([]);
  readonly credits = signal(0);
  readonly busy = signal(false);
  readonly acting = signal(false);
  readonly msg = signal('');
  readonly msgOk = signal(true);

  buyQty: Record<string, number> = {};
  sellQty: Record<string, number> = {};
  offerKey = '';
  offerQty = 1;
  askKey = 'battery';
  askQty = 1;
  private names = new Map<string, string>();
  private recipes: WorldRecipe[] = [];

  ngOnInit(): void {
    this.world.getCatalog().subscribe(c => {
      this.catalog.set(c.items || []);
      this.vendor.set(c.vendor || []);
      this.recipes = c.recipes || [];
      this.names.clear();
      for (const it of c.items || []) this.names.set(it.key, it.name);
      for (const it of c.vendor || []) {
        this.buyQty[it.key] = 1;
        this.names.set(it.key, it.name);
      }
      if (!this.askKey && (c.items || []).length) this.askKey = c.items[0].key;
    });
  }

  ngOnDestroy(): void {
    this.close();
  }

  open(kind: Overlay): void {
    this.overlay.set(kind);
    this.msg.set('');
    this.reload();
  }

  close(): void {
    this.overlay.set('none');
  }

  label(key: string): string {
    return this.names.get(key) || key.replace(/_/g, ' ');
  }

  reload(): void {
    if (!this.auth.isLoggedIn()) return;
    this.busy.set(true);
    this.world.getInventory().subscribe(res => {
      this.items.set(res.items || []);
      this.credits.set(res.stormCredits || 0);
      for (const it of res.items || []) {
        this.names.set(it.key, it.name);
        this.sellQty[it.key] = 1;
      }
      if (!this.offerKey && res.items?.length) this.offerKey = res.items[0].key;
      this.busy.set(false);
      this.syncUserCredits(res.stormCredits || 0);
    });
    this.world.getTrades().subscribe(rows => this.trades.set(rows || []));
    this.world.getVendorStock().subscribe(rows => {
      if (rows?.length) this.vendor.set(rows);
    });
  }

  buyVendor(it: WorldItem): void {
    const qty = Math.max(1, Math.min(25, +(this.buyQty[it.key] || 1)));
    this.acting.set(true);
    this.world.vendorBuy(it.key, qty).subscribe(res => {
      this.acting.set(false);
      if (!res?.ok) {
        this.flash(false, 'Buy failed — credits, stock, or slow down.');
        return;
      }
      this.flash(true, `Bought ${qty}× ${it.name} (−${res.creditsSpent || 0} ₡)`);
      this.applyInv(res.inventory, res.stormCredits);
    });
  }

  sellVendor(it: WorldItem): void {
    const max = it.count || 1;
    const qty = Math.max(1, Math.min(max, Math.min(25, +(this.sellQty[it.key] || 1))));
    this.acting.set(true);
    this.world.vendorSell(it.key, qty).subscribe(res => {
      this.acting.set(false);
      if (!res?.ok) {
        this.flash(false, 'Sell failed — try fewer items or wait a second.');
        return;
      }
      this.flash(true, `Sold ${qty}× ${it.name} (+${res.creditsGained || 0} ₡)`);
      this.applyInv(res.inventory, res.stormCredits);
    });
  }

  buyListing(id: string): void {
    this.acting.set(true);
    this.world.buyTrade(id).subscribe(res => {
      this.acting.set(false);
      if (!res?.ok) {
        this.flash(false, 'Barter failed — missing ask items or slow down.');
        return;
      }
      this.flash(true, 'Barter complete.');
      this.applyInv(res.inventory, res.stormCredits);
      this.world.getTrades().subscribe(rows => this.trades.set(rows || []));
    });
  }

  cancelListing(id: string): void {
    this.acting.set(true);
    this.world.cancelTrade(id).subscribe(ok => {
      this.acting.set(false);
      this.flash(ok, ok ? 'Listing cancelled.' : 'Could not cancel — slow down?');
      this.reload();
    });
  }

  listTrade(): void {
    this.acting.set(true);
    this.world.createTrade({
      offerKey: this.offerKey.trim(),
      offerQty: Math.max(1, Math.min(20, +this.offerQty || 1)),
      askKey: this.askKey.trim(),
      askQty: Math.max(1, Math.min(20, +this.askQty || 1)),
    }).subscribe(row => {
      this.acting.set(false);
      this.flash(!!row, row ? 'Listed (items reserved).' : 'List failed — qty, packs, or rate limit.');
      this.reload();
    });
  }

  private applyInv(inv?: WorldItem[], credits?: number): void {
    if (inv) {
      this.items.set(inv);
      for (const it of inv) {
        this.names.set(it.key, it.name);
        this.sellQty[it.key] = this.sellQty[it.key] || 1;
      }
    }
    if (typeof credits === 'number') {
      this.credits.set(credits);
      this.syncUserCredits(credits);
    }
  }

  private syncUserCredits(n: number): void {
    const u = this.auth.user();
    if (u) this.auth.user.set({ ...u, stormCredits: n });
  }

  private flash(ok: boolean, text: string): void {
    this.msgOk.set(ok);
    this.msg.set(text);
  }
}
