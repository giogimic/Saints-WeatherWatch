import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth.service';
import { OpsStateService } from '../../../core/ops-state.service';
import { WeatherService } from '../../../core/weather.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (auth.modalOpen()) {
      <div class="fixed inset-0 z-[2000] bg-black/60 flex items-end sm:items-center justify-center p-3" (click)="auth.closeModal()">
        <div class="storm-card w-full max-w-md p-5 space-y-4" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between gap-2">
            <h2 class="font-black uppercase italic text-white text-lg">
              {{ auth.modalMode() === 'signup' ? 'Create chaser profile' : 'Chaser login' }}
            </h2>
            <button type="button" class="btn btn-ghost btn-sm" (click)="auth.closeModal()">✕</button>
          </div>
          <p class="text-xs text-base-content/55 font-semibold">
            Chaser name + 4-digit PIN. Optional email is stored only — we won’t email you from here.
          </p>

          <label class="block space-y-1">
            <span class="text-[10px] font-black uppercase tracking-widest text-base-content/45">Chaser name</span>
            <input class="input input-bordered w-full bg-base-200/80 border-base-300 rounded-xl font-bold" maxlength="24" [(ngModel)]="name">
          </label>
          <label class="block space-y-1">
            <span class="text-[10px] font-black uppercase tracking-widest text-base-content/45">4-digit PIN</span>
            <input class="input input-bordered w-full bg-base-200/80 border-base-300 rounded-xl font-bold tracking-[0.4em]" maxlength="4" inputmode="numeric" pattern="[0-9]*" [(ngModel)]="pin">
          </label>
          @if (auth.modalMode() === 'signup') {
            <label class="block space-y-1">
              <span class="text-[10px] font-black uppercase tracking-widest text-base-content/45">Email (optional)</span>
              <input type="email" class="input input-bordered w-full bg-base-200/80 border-base-300 rounded-xl font-semibold" [(ngModel)]="email">
            </label>
          }

          @if (error) {
            <p class="text-error text-xs font-bold">{{ error }}</p>
          }

          <button type="button" class="btn btn-primary w-full rounded-xl font-black uppercase min-h-12" [disabled]="busy" (click)="submit()">
            {{ busy ? 'Working…' : (auth.modalMode() === 'signup' ? 'Create profile' : 'Log in') }}
          </button>

          <button type="button" class="btn btn-ghost btn-sm w-full font-bold uppercase" (click)="flip()">
            {{ auth.modalMode() === 'signup' ? 'Already have a profile? Log in' : 'New here? Create a profile' }}
          </button>
        </div>
      </div>
    }
  `,
})
export class AuthModalComponent {
  readonly auth = inject(AuthService);
  private readonly weather = inject(WeatherService);
  private readonly ops = inject(OpsStateService);

  name = '';
  pin = '';
  email = '';
  error = '';
  busy = false;

  flip(): void {
    this.error = '';
    this.auth.modalMode.set(this.auth.modalMode() === 'signup' ? 'login' : 'signup');
  }

  submit(): void {
    this.error = '';
    if (this.name.trim().length < 3) {
      this.error = 'Chaser name needs at least 3 characters.';
      return;
    }
    if (!/^\d{4}$/.test(this.pin)) {
      this.error = 'PIN must be exactly 4 digits.';
      return;
    }
    this.busy = true;
    const req$ = this.auth.modalMode() === 'signup'
      ? this.auth.signup(this.name.trim(), this.pin, this.email.trim() || undefined)
      : this.auth.login(this.name.trim(), this.pin);

    req$.subscribe({
      next: () => {
        this.busy = false;
        this.ops.reloadAccountData();
        this.flushPendingQuiz();
        this.flushPendingChase();
      },
      error: (err) => {
        this.busy = false;
        this.error = err?.error || 'Could not complete request.';
        if (typeof this.error !== 'string') this.error = 'Could not complete request.';
      },
    });
  }

  private flushPendingQuiz(): void {
    const pending = this.auth.pendingQuiz;
    if (!pending) return;
    this.weather.saveQuizAttempt(pending).subscribe(res => {
      this.auth.pendingQuiz = null;
      if (res) {
        this.auth.refreshMe().subscribe(() => this.ops.reloadAccountData());
      }
    });
  }

  private flushPendingChase(): void {
    const pending = this.auth.pendingChase;
    if (!pending?.items?.length) return;
    this.weather.saveChaseRun(pending).subscribe(res => {
      this.auth.pendingChase = null;
      if (res) {
        this.auth.refreshMe().subscribe(() => this.ops.reloadAccountData());
      }
    });
  }
}
