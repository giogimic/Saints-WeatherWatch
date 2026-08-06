import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { LogbookComponent } from './shared/components/logbook/logbook.component';
import { AuthModalComponent } from './shared/components/auth-modal/auth-modal.component';
import { AlertBannerComponent } from './shared/components/alert-banner/alert-banner.component';
import { BagMarketDockComponent } from './shared/components/bag-market-dock/bag-market-dock.component';
import { AuthService } from './core/auth.service';
import { OpsStateService } from './core/ops-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    LogbookComponent, AuthModalComponent, AlertBannerComponent, BagMarketDockComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private readonly auth = inject(AuthService);
  readonly ops = inject(OpsStateService);

  title = 'Saints Weather Watch';
  readonly year = new Date().getFullYear();
  moreOpen = false;

  private readonly baseNav = [
    { path: '', label: 'Home', icon: '🏠', authOnly: false },
    { path: 'map', label: 'Map', icon: '🗺️', authOnly: false },
    { path: 'alerts', label: 'Alerts', icon: '🚨', authOnly: false },
    { path: 'live', label: 'Live', icon: '📹', authOnly: false },
    { path: 'archive', label: 'Archive', icon: '🗄️', authOnly: false },
    { path: 'learn', label: 'Learn', icon: '📚', authOnly: false },
    { path: 'play', label: 'Play', icon: '🎮', authOnly: false },
    { path: 'dashboard', label: 'Profile', icon: '👤', authOnly: true },
  ];

  private readonly baseMore = [
    { path: '', label: 'Home', icon: '🏠', authOnly: false },
    { path: 'learn', label: 'Learn', icon: '📚', authOnly: false },
    { path: 'play', label: 'Play', icon: '🎮', authOnly: false },
    { path: 'trade', label: 'Trade', icon: '🔁', authOnly: false },
    { path: 'dashboard', label: 'Profile', icon: '👤', authOnly: true },
    { path: 'account', label: 'Account', icon: '⚙️', authOnly: false },
  ];

  readonly navItems = computed(() => {
    const loggedIn = this.auth.isLoggedIn();
    return this.baseNav.filter(i => !i.authOnly || loggedIn);
  });

  readonly mobileMore = computed(() => {
    const loggedIn = this.auth.isLoggedIn();
    return this.baseMore.filter(i => !i.authOnly || loggedIn);
  });

  mobilePrimary = [
    { path: 'map', label: 'Map', icon: '🗺️' },
    { path: 'alerts', label: 'Alerts', icon: '🚨' },
    { path: 'live', label: 'Live', icon: '📹' },
    { path: 'archive', label: 'Archive', icon: '🗄️' },
  ];

  ngOnInit(): void {
    this.auth.bootstrap();
    this.ops.start();
  }

  toggleMore(): void {
    this.moreOpen = !this.moreOpen;
  }

  closeMore(): void {
    this.moreOpen = false;
  }
}
