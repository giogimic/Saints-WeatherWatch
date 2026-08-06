import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { LogbookComponent } from './shared/components/logbook/logbook.component';
import { AuthModalComponent } from './shared/components/auth-modal/auth-modal.component';
import { AlertBannerComponent } from './shared/components/alert-banner/alert-banner.component';
import { AuthService } from './core/auth.service';
import { OpsStateService } from './core/ops-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LogbookComponent, AuthModalComponent, AlertBannerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private readonly auth = inject(AuthService);
  readonly ops = inject(OpsStateService);

  title = 'Saints Weather Watch';
  moreOpen = false;

  navItems = [
    { path: '', label: 'Home', icon: '🏠' },
    { path: 'map', label: 'Map', icon: '🗺️' },
    { path: 'alerts', label: 'Alerts', icon: '🚨' },
    { path: 'live', label: 'Live', icon: '📹' },
    { path: 'archive', label: 'Archive', icon: '🗄️' },
    { path: 'learn', label: 'Learn', icon: '📚' },
    { path: 'play', label: 'Play', icon: '🎮' },
    { path: 'dashboard', label: 'Desk', icon: '🎛️' },
  ];

  mobilePrimary = [
    { path: 'map', label: 'Map', icon: '🗺️' },
    { path: 'alerts', label: 'Alerts', icon: '🚨' },
    { path: 'live', label: 'Live', icon: '📹' },
    { path: 'archive', label: 'Archive', icon: '🗄️' },
  ];

  mobileMore = [
    { path: '', label: 'Home', icon: '🏠' },
    { path: 'learn', label: 'Learn', icon: '📚' },
    { path: 'play', label: 'Play', icon: '🎮' },
    { path: 'dashboard', label: 'Desk', icon: '🎛️' },
    { path: 'account', label: 'Account', icon: '👤' },
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
