import { Component, Input } from '@angular/core';

/** Simple medieval/hand-drawn-style SVGs keyed by item name themes. */
@Component({
  selector: 'app-item-icon',
  standalone: true,
  template: `
    <svg [attr.viewBox]="'0 0 40 40'" class="w-full h-full" aria-hidden="true">
      @switch (glyph) {
        @case ('metal') {
          <rect x="8" y="14" width="24" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M12 18h16M12 22h10" stroke="currentColor" stroke-width="1.5" fill="none"/>
        }
        @case ('wire') {
          <path d="M6 28 Q20 6 34 28" fill="none" stroke="currentColor" stroke-width="2.2"/>
          <path d="M10 24 Q20 12 30 24" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.7"/>
        }
        @case ('battery') {
          <rect x="12" y="10" width="16" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
          <rect x="16" y="6" width="8" height="4" fill="currentColor"/>
          <path d="M16 18h8M16 24h8" stroke="currentColor" stroke-width="1.5"/>
        }
        @case ('plastic') {
          <path d="M10 28 L14 10h12l4 18z" fill="none" stroke="currentColor" stroke-width="2"/>
        }
        @case ('note') {
          <rect x="10" y="8" width="20" height="24" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M14 14h12M14 19h12M14 24h8" stroke="currentColor" stroke-width="1.4"/>
        }
        @case ('fuel') {
          <path d="M12 12h12v20H12z" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M24 16h4l2 4v8h-6" fill="none" stroke="currentColor" stroke-width="1.8"/>
          <circle cx="18" cy="20" r="2" fill="currentColor"/>
        }
        @case ('camera') {
          <rect x="8" y="14" width="24" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
          <circle cx="20" cy="22" r="5" fill="none" stroke="currentColor" stroke-width="1.8"/>
          <rect x="24" y="10" width="6" height="4" fill="currentColor"/>
        }
        @case ('gps') {
          <circle cx="20" cy="20" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
          <circle cx="20" cy="20" r="3" fill="currentColor"/>
          <path d="M20 6v4M20 30v4M6 20h4M30 20h4" stroke="currentColor" stroke-width="1.5"/>
        }
        @case ('radio') {
          <rect x="10" y="14" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M14 10l12 4" stroke="currentColor" stroke-width="2"/>
          <circle cx="16" cy="22" r="2" fill="currentColor"/>
          <path d="M22 18h4M22 22h4M22 26h3" stroke="currentColor" stroke-width="1.4"/>
        }
        @case ('solar') {
          <rect x="8" y="12" width="24" height="16" rx="1" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M8 20h24M20 12v16M14 12v16M26 12v16" stroke="currentColor" stroke-width="1.2"/>
        }
        @case ('tire') {
          <circle cx="20" cy="20" r="11" fill="none" stroke="currentColor" stroke-width="2.2"/>
          <circle cx="20" cy="20" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/>
        }
        @case ('journal') {
          <path d="M11 8h16a2 2 0 012 2v20H13a2 2 0 01-2-2V8z" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M15 14h10M15 19h10M15 24h6" stroke="currentColor" stroke-width="1.3"/>
        }
        @case ('blueprint') {
          <rect x="8" y="8" width="24" height="24" rx="1" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2"/>
          <path d="M12 28V14l8 4 8-4v14" fill="none" stroke="currentColor" stroke-width="1.6"/>
        }
        @case ('sensor') {
          <circle cx="20" cy="20" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M20 8v4M20 28v4M8 20h4M28 20h4" stroke="currentColor" stroke-width="1.8"/>
          <circle cx="20" cy="20" r="2.5" fill="currentColor"/>
        }
        @case ('sample') {
          <path d="M16 8h8v6l4 18H12l4-18z" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M15 24h10" stroke="currentColor" stroke-width="1.4"/>
        }
        @case ('probe') {
          <path d="M20 6v18" stroke="currentColor" stroke-width="2.2"/>
          <circle cx="20" cy="28" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M14 12h12" stroke="currentColor" stroke-width="1.5"/>
        }
        @case ('kit') {
          <rect x="8" y="14" width="24" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M14 14V11h12v3M20 18v8M16 22h8" stroke="currentColor" stroke-width="1.6"/>
        }
        @case ('photo') {
          <rect x="7" y="11" width="26" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
          <circle cx="20" cy="20" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
          <path d="M10 15h4" stroke="currentColor" stroke-width="1.5"/>
        }
        @case ('radar') {
          <circle cx="20" cy="22" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M20 22 L30 12" stroke="currentColor" stroke-width="2"/>
          <circle cx="20" cy="22" r="2" fill="currentColor"/>
        }
        @case ('hail') {
          <circle cx="16" cy="16" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/>
          <circle cx="24" cy="20" r="5" fill="none" stroke="currentColor" stroke-width="1.8"/>
          <circle cx="18" cy="26" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
        }
        @case ('flag') {
          <path d="M12 8v24" stroke="currentColor" stroke-width="2"/>
          <path d="M12 10h16l-4 6 4 6H12z" fill="none" stroke="currentColor" stroke-width="1.8"/>
        }
        @case ('funnel') {
          <path d="M10 8h20l-6 10 4 14H12l4-14z" fill="none" stroke="currentColor" stroke-width="2"/>
        }
        @case ('bolt') {
          <path d="M22 6 L14 20h6l-2 14 10-16h-6z" fill="none" stroke="currentColor" stroke-width="2"/>
        }
        @case ('coin') {
          <circle cx="20" cy="20" r="11" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M20 12v16M15 16h10M15 24h10" stroke="currentColor" stroke-width="1.5"/>
        }
        @case ('medal') {
          <circle cx="20" cy="16" r="8" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M14 22l-3 12 9-5 9 5-3-12" fill="none" stroke="currentColor" stroke-width="1.6"/>
        }
        @default {
          <rect x="10" y="10" width="20" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M15 20h10M20 15v10" stroke="currentColor" stroke-width="1.6"/>
        }
      }
    </svg>
  `,
})
export class ItemIconComponent {
  @Input() itemKey = '';

  get glyph(): string {
    const k = (this.itemKey || '').toLowerCase();
    if (k.includes('scrap') || k.includes('copper') || k.includes('aluminum') || k.includes('metal')) return 'metal';
    if (k.includes('wir')) return 'wire';
    if (k.includes('battery')) return 'battery';
    if (k.includes('plastic')) return 'plastic';
    if (k.includes('note') || k.includes('scientific')) return 'note';
    if (k.includes('fuel')) return 'fuel';
    if (k.includes('camera')) return 'camera';
    if (k.includes('gps')) return 'gps';
    if (k.includes('radio')) return 'radio';
    if (k.includes('solar_cell') || (k.includes('solar') && !k.includes('pack'))) return 'solar';
    if (k.includes('tire')) return 'tire';
    if (k.includes('journal') || k.includes('weather_journal') || k.includes('field_journal')) return 'journal';
    if (k.includes('blueprint')) return 'blueprint';
    if (k.includes('sensor')) return 'sensor';
    if (k.includes('research') || k.includes('sample')) return 'sample';
    if (k.includes('probe')) return 'probe';
    if (k.includes('kit') || k.includes('repair')) return 'kit';
    if (k.includes('solar_pack') || k.includes('pack')) return 'solar';
    if (k.includes('photo')) return 'photo';
    if (k.includes('radar')) return 'radar';
    if (k.includes('hail')) return 'hail';
    if (k.includes('flag') || k.includes('wind')) return 'flag';
    if (k.includes('funnel')) return 'funnel';
    if (k.includes('lightning')) return 'bolt';
    if (k.includes('coin') || k.includes('mesocyclone')) return 'coin';
    if (k.includes('medal')) return 'medal';
    if (k.includes('electronics')) return 'sensor';
    return 'default';
  }
}
