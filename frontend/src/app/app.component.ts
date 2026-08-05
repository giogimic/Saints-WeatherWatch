import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { LogbookComponent } from './shared/components/logbook/logbook.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LogbookComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Saints Weather Watch';

  navItems = [
    { path: '', label: 'Home', icon: '🏠' },
    { path: 'map', label: 'Map', icon: '🗺️' },
    { path: 'alerts', label: 'Alerts', icon: '🚨' },
    { path: 'live', label: 'Live', icon: '📹' },
    { path: 'archive', label: 'Archive', icon: '🗄️' },
    { path: 'learn', label: 'Learn', icon: '📚' },
    { path: 'play', label: 'Play', icon: '🎮' },
  ];
}