import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { OpsStateService } from '../../core/ops-state.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-[calc(100vh-4rem)] p-4 md:p-6">
      <div class="max-w-md mx-auto space-y-4">
        <h1 class="text-3xl font-black text-white italic uppercase tracking-wider font-sans">Chaser Account</h1>

        @if (auth.user(); as u) {
          <article class="storm-card p-5 space-y-3">
            <div class="text-[10px] font-black uppercase tracking-widest text-primary">Signed in</div>
            <div class="text-2xl font-black text-white italic">{{ u.chaserName }}</div>
            <p class="text-xs text-base-content/50 font-semibold">Equipped: {{ u.equippedVehicleKey }}</p>
            <a routerLink="/dashboard" class="btn btn-primary w-full rounded-xl font-black uppercase min-h-12">Open dashboard</a>
            <button type="button" class="btn btn-ghost border border-base-300 w-full rounded-xl font-black uppercase min-h-12" (click)="logout()">Log out</button>
          </article>
        } @else {
          <article class="storm-card p-5 space-y-3">
            <p class="text-sm text-base-content/60 font-semibold">
              Create a chaser profile to save quiz scores, unlock vehicles, and build your live dashboard.
            </p>
            <button type="button" class="btn btn-primary w-full rounded-xl font-black uppercase min-h-12" (click)="auth.openModal('signup')">Create profile</button>
            <button type="button" class="btn btn-ghost border border-base-300 w-full rounded-xl font-black uppercase min-h-12" (click)="auth.openModal('login')">Log in</button>
          </article>
        }
      </div>
    </div>
  `,
})
export class AccountComponent {
  readonly auth = inject(AuthService);
  private readonly ops = inject(OpsStateService);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout().subscribe(() => {
      this.ops.reloadAccountData();
      this.router.navigateByUrl('/play');
    });
  }
}
