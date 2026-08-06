import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TradeListing, ResearchLogEntry, WorldItem, WorldRecipe, WorldService } from '../../core/world.service';

@Component({
  selector: 'app-trade-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-[calc(100vh-4rem)] p-4 md:p-6">
      <div class="max-w-4xl mx-auto space-y-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.25em] text-accent">Storm World</p>
            <h1 class="text-3xl font-black text-white italic uppercase">Trade & Craft</h1>
            <p class="text-sm text-base-content/55 font-semibold mt-1">
              Server-checked barters and recipes. Inventory never trusts the browser.
            </p>
          </div>
          <a routerLink="/play" class="btn btn-sm btn-primary rounded-xl font-black uppercase">Play / World</a>
        </div>

        @if (!auth.isLoggedIn()) {
          <article class="storm-card p-4">
            <p class="text-sm font-semibold text-base-content/70">Log in to craft and trade.</p>
            <button type="button" class="btn btn-primary btn-sm mt-2 rounded-xl font-black uppercase" (click)="auth.openModal('login')">
              Log in
            </button>
          </article>
        } @else {
          <article class="storm-card p-4 space-y-2">
            <h2 class="text-xs font-black uppercase tracking-widest text-primary">Your packs</h2>
            @if (inventory.length === 0) {
              <p class="text-xs text-base-content/50 font-semibold">Empty — drive Storm World and bag shared drops.</p>
            } @else {
              <ul class="grid sm:grid-cols-2 gap-2">
                @for (item of inventory; track item.key) {
                  <li class="flex justify-between text-sm border border-base-300/50 rounded-lg px-3 py-2">
                    <span class="font-bold text-white truncate">{{ item.name }}</span>
                    <span class="font-black text-accent tabular-nums">×{{ item.count }}</span>
                  </li>
                }
              </ul>
            }
            <button type="button" class="btn btn-ghost btn-xs font-bold uppercase" (click)="reload()">Refresh</button>
          </article>

          <article class="storm-card p-4 space-y-3">
            <h2 class="text-xs font-black uppercase tracking-widest text-secondary">Craft bench</h2>
            <div class="grid gap-2">
              @for (r of recipes; track r.id) {
                <div class="flex flex-col sm:flex-row sm:items-center gap-2 border border-base-300/40 rounded-xl p-3">
                  <div class="flex-1 min-w-0">
                    <div class="font-black text-white text-sm">{{ r.name }}</div>
                    <div class="text-xs text-base-content/50 font-semibold">{{ r.blurb }} · Lv {{ r.minLevel }}+</div>
                    <div class="text-[10px] font-bold uppercase tracking-wider text-base-content/40 mt-1">
                      Needs
                      @for (in of r.inputs; track in.key) {
                        <span class="mr-2">{{ in.qty }}× {{ itemLabel(in.key) }}</span>
                      }
                      → {{ r.output.qty }}× {{ itemLabel(r.output.key) }}
                    </div>
                  </div>
                  <button type="button" class="btn btn-primary btn-sm rounded-xl font-black uppercase min-h-11" (click)="doCraft(r.id)">
                    Craft
                  </button>
                </div>
              }
            </div>
            @if (craftMsg) {
              <p class="text-xs font-bold" [class.text-success]="craftOk" [class.text-error]="!craftOk">{{ craftMsg }}</p>
            }
          </article>

          <article class="storm-card p-4 space-y-3">
            <h2 class="text-xs font-black uppercase tracking-widest text-accent">Trade center</h2>
            <div class="grid sm:grid-cols-2 gap-2">
              <label class="text-xs font-bold uppercase tracking-wider text-base-content/45">
                Offer from packs
                <select class="select select-sm select-bordered w-full mt-1 font-semibold" [(ngModel)]="offerKey">
                  @for (item of inventory; track item.key) {
                    <option [value]="item.key">{{ item.name }} (×{{ item.count }})</option>
                  }
                </select>
              </label>
              <label class="text-xs font-bold uppercase tracking-wider text-base-content/45">
                Offer qty
                <input type="number" min="1" class="input input-sm input-bordered w-full mt-1 font-semibold" [(ngModel)]="offerQty">
              </label>
              <label class="text-xs font-bold uppercase tracking-wider text-base-content/45">
                Ask for
                <select class="select select-sm select-bordered w-full mt-1 font-semibold" [(ngModel)]="askKey">
                  @for (item of catalogItems; track item.key) {
                    <option [value]="item.key">{{ item.name }}</option>
                  }
                </select>
              </label>
              <label class="text-xs font-bold uppercase tracking-wider text-base-content/45">
                Ask qty
                <input type="number" min="1" class="input input-sm input-bordered w-full mt-1 font-semibold" [(ngModel)]="askQty">
              </label>
            </div>
            <button type="button" class="btn btn-secondary btn-sm rounded-xl font-black uppercase min-h-11" (click)="listTrade()">
              List barter
            </button>
            @if (tradeMsg) {
              <p class="text-xs font-bold text-base-content/70">{{ tradeMsg }}</p>
            }

            <ul class="space-y-2 max-h-80 overflow-y-auto">
              @for (t of trades; track t.id) {
                <li class="flex flex-wrap items-center gap-2 border border-base-300/40 rounded-xl px-3 py-2 text-sm">
                  <span class="font-bold text-white flex-1">
                    {{ t.offerQty }}× {{ itemLabel(t.offerKey) }}
                    <span class="text-base-content/40">for</span>
                    {{ t.askQty }}× {{ itemLabel(t.askKey) }}
                  </span>
                  @if (t.sellerId === auth.user()?.id) {
                    <button type="button" class="btn btn-ghost btn-xs font-black uppercase" (click)="cancel(t.id)">Cancel</button>
                  } @else {
                    <button type="button" class="btn btn-primary btn-xs font-black uppercase" (click)="buy(t.id)">Buy</button>
                  }
                </li>
              } @empty {
                <li class="text-xs text-base-content/50 font-semibold">No open listings.</li>
              }
            </ul>
          </article>

          <article class="storm-card p-4 space-y-3">
            <h2 class="text-xs font-black uppercase tracking-widest text-sky-300">Research log</h2>
            <p class="text-[10px] text-base-content/50 font-semibold leading-relaxed">
              {{ researchNote || 'SIM grants from time-on-station near live NWS cells. Official severity is never changed.' }}
            </p>
            <ul class="space-y-2 max-h-72 overflow-y-auto">
              @for (row of researchLog; track row.id) {
                <li class="border border-base-300/40 rounded-xl px-3 py-2 text-sm">
                  <div class="font-black text-white text-xs uppercase tracking-wider">
                    {{ row.severity || 'Alert' }}
                    <span class="text-base-content/40 font-bold normal-case">· {{ row.createdAt | date:'short' }}</span>
                  </div>
                  <div class="font-semibold text-white/90 truncate">{{ row.headline }}</div>
                  <div class="text-[10px] text-base-content/45 font-bold truncate">{{ row.area }} · +{{ row.qty }} {{ itemLabel(row.itemKey) }}</div>
                </li>
              } @empty {
                <li class="text-xs text-base-content/50 font-semibold">No samples yet — hold near an active alert in Storm World.</li>
              }
            </ul>
          </article>
        }
      </div>
    </div>
  `,
})
export class TradeCenterComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly world = inject(WorldService);

  inventory: WorldItem[] = [];
  catalogItems: WorldItem[] = [];
  recipes: WorldRecipe[] = [];
  trades: TradeListing[] = [];
  researchLog: ResearchLogEntry[] = [];
  researchNote = '';
  offerKey = '';
  offerQty = 1;
  askKey = 'battery';
  askQty = 1;
  craftMsg = '';
  craftOk = false;
  tradeMsg = '';
  private nameByKey = new Map<string, string>();

  ngOnInit(): void {
    this.world.getCatalog().subscribe(c => {
      this.recipes = c.recipes || [];
      this.catalogItems = c.items || [];
      this.nameByKey.clear();
      for (const it of this.catalogItems) this.nameByKey.set(it.key, it.name);
      if (!this.askKey && this.catalogItems.length) this.askKey = this.catalogItems[0].key;
    });
    this.reload();
  }

  reload(): void {
    if (!this.auth.isLoggedIn()) return;
    this.world.getInventory().subscribe(rows => {
      this.inventory = rows || [];
      for (const it of this.inventory) this.nameByKey.set(it.key, it.name);
      if (!this.offerKey && this.inventory.length) this.offerKey = this.inventory[0].key;
      if (this.offerKey && !this.inventory.some(i => i.key === this.offerKey)) {
        this.offerKey = this.inventory[0]?.key || '';
      }
    });
    this.world.getTrades().subscribe(rows => this.trades = rows || []);
    this.world.getResearchLog().subscribe(res => {
      this.researchLog = res.items || [];
      this.researchNote = res.note || '';
    });
  }

  itemLabel(key: string): string {
    return this.nameByKey.get(key) || key.replace(/_/g, ' ');
  }

  doCraft(id: string): void {
    this.world.craft(id).subscribe(res => {
      if (!res?.ok) {
        this.craftOk = false;
        this.craftMsg = 'Craft failed — check level and materials.';
        return;
      }
      this.craftOk = true;
      this.craftMsg = 'Crafted!';
      if (res.inventory) this.inventory = res.inventory;
      else this.reload();
    });
  }

  listTrade(): void {
    this.world.createTrade({
      offerKey: this.offerKey.trim(),
      offerQty: Math.max(1, +this.offerQty || 1),
      askKey: this.askKey.trim(),
      askQty: Math.max(1, +this.askQty || 1),
    }).subscribe(row => {
      this.tradeMsg = row ? 'Listed (items reserved).' : 'Could not list — check packs.';
      this.reload();
    });
  }

  buy(id: string): void {
    this.world.buyTrade(id).subscribe(res => {
      this.tradeMsg = res?.ok ? 'Trade complete.' : 'Buy failed.';
      if (res?.inventory) this.inventory = res.inventory;
      this.reload();
    });
  }

  cancel(id: string): void {
    this.world.cancelTrade(id).subscribe(() => this.reload());
  }
}
