import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
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
    { path: 'learn', label: 'Learn', icon: '📚' },
    { path: 'play', label: 'Play', icon: '🎮' },
  ];
}