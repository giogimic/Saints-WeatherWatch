import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
    title: 'Saints Weather Watch — Storm Tracking & Education',
  },
  {
    path: 'map',
    loadComponent: () =>
      import('./features/map/map.component').then((m) => m.MapComponent),
    title: 'Live Map — Saints Weather Watch',
  },
  {
    path: 'alerts',
    loadComponent: () =>
      import('./features/alerts/alerts.component').then((m) => m.AlertsComponent),
    title: 'Alerts — Saints Weather Watch',
  },
  {
    path: 'live',
    loadComponent: () =>
      import('./features/live/live.component').then((m) => m.LiveComponent),
    title: 'Chaser Live — Saints Weather Watch',
  },
  {
    path: 'learn',
    loadComponent: () =>
      import('./features/learn/learn.component').then((m) => m.LearnComponent),
    title: 'Learn — Saints Weather Watch',
  },
  {
    path: 'play',
    loadComponent: () =>
      import('./features/play/play.component').then((m) => m.PlayComponent),
    title: 'Play — Saints Weather Watch',
  },
  {
    path: 'account',
    loadComponent: () =>
      import('./features/account/account.component').then((m) => m.AccountComponent),
    title: 'Account — Saints Weather Watch',
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    title: 'Dashboard — Saints Weather Watch',
  },
  {
    path: 'trade',
    loadComponent: () =>
      import('./features/trade/trade-center.component').then((m) => m.TradeCenterComponent),
    title: 'Trade & Craft — Saints Weather Watch',
  },
  {
    path: 'archive',
    loadComponent: () =>
      import('./features/archive/archive.component').then((m) => m.ArchiveComponent),
    title: 'Archive — Saints Weather Watch',
  },
  { path: '**', redirectTo: '' },
];
