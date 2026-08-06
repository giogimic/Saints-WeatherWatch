/** Stable vehicle keys for rewards + Radar Chase map game.
 * Compact side-view storm-chase trucks — small footprint, bold outline, chase gear.
 */

const OUT = '#0b1120';

/** Extra padding in the viewBox so icons read smaller in garage cards. */
function frame(inner: string): string {
  return `<svg viewBox="0 0 180 96" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

const shadow = `<ellipse cx="90" cy="86" rx="58" ry="5" fill="#020617" opacity="0.32"/>`;

function wheel(cx: number, cy: number, r: number, rim = '#cbd5e1'): string {
  return `<g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#111827" stroke="${OUT}" stroke-width="2.2"/>
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.78).toFixed(1)}" fill="none" stroke="#1f2937" stroke-width="${Math.max(2.5, r * 0.28).toFixed(1)}" stroke-dasharray="3.5 4.5"/>
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.48).toFixed(1)}" fill="${rim}" stroke="#64748b" stroke-width="1.4"/>
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.14).toFixed(1)}" fill="#334155"/>
  </g>`;
}

function glass(d: string, fill = '#7dd3fc'): string {
  return `<path d="${d}" fill="${fill}" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>`;
}

/** Compact sedan with roof antenna — starter chase car. */
const starterCar = frame(`
  ${shadow}
  <line x1="98" y1="28" x2="98" y2="40" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
  <circle cx="98" cy="26" r="2.5" fill="#fbbf24" stroke="${OUT}" stroke-width="1.2"/>
  <path d="M38 68 L38 56 Q38 50 46 49 L58 47 L68 36 Q70 33 76 33 L108 33 Q114 33 116 37 L124 48 L138 51 Q144 53 144 58 L144 68 Z"
        fill="#38bdf8" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M42 60 H140" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round"/>
  ${glass('M70 47 L78 36 L96 36 L96 47 Z')}
  ${glass('M100 36 L110 36 L120 47 L100 47 Z')}
  <rect x="36" y="54" width="8" height="5" rx="1.5" fill="#fde68a" stroke="${OUT}" stroke-width="1.2"/>
  <rect x="136" y="54" width="6" height="5" rx="1.5" fill="#f87171" stroke="${OUT}" stroke-width="1.2"/>
  ${wheel(58, 70, 11)}
  ${wheel(126, 70, 11)}
`);

/** Box van with roof radar dish. */
const radarVan = frame(`
  ${shadow}
  <ellipse cx="118" cy="22" rx="14" ry="5" fill="#fbbf24" stroke="${OUT}" stroke-width="1.8"/>
  <rect x="116" y="26" width="4" height="12" rx="1" fill="#475569" stroke="${OUT}" stroke-width="1.2"/>
  <path d="M132 18 a10 10 0 0 1 0 10" fill="none" stroke="#fbbf24" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M36 68 L36 52 Q36 46 44 45 L54 44 L62 34 Q64 31 70 31 L140 31 Q148 31 148 40 L148 68 Z"
        fill="#a78bfa" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M40 58 H144" stroke="#7c3aed" stroke-width="3" stroke-linecap="round"/>
  ${glass('M64 44 L72 34 L86 34 L86 44 Z', '#ddd6fe')}
  ${glass('M92 34 L112 34 L112 44 L92 44 Z', '#ddd6fe')}
  ${glass('M118 34 L138 34 L138 44 L118 44 Z', '#ddd6fe')}
  <rect x="34" y="52" width="8" height="5" rx="1.5" fill="#fde68a" stroke="${OUT}" stroke-width="1.2"/>
  ${wheel(56, 70, 11)}
  ${wheel(128, 70, 11)}
`);

/** Lifted SUV with emergency light bar. */
const rescueSuv = frame(`
  ${shadow}
  <rect x="72" y="26" width="40" height="6" rx="2.5" fill="#0f172a" stroke="${OUT}" stroke-width="1.5"/>
  <rect x="75" y="27.5" width="15" height="3" rx="1" fill="#ef4444"/>
  <rect x="94" y="27.5" width="15" height="3" rx="1" fill="#3b82f6"/>
  <path d="M34 68 L34 54 Q34 48 42 47 L54 45 L64 34 Q66 31 72 31 L118 31 Q126 31 128 36 L136 46 L144 49 Q148 51 148 56 L148 68 Z"
        fill="#34d399" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M38 58 H144" stroke="#059669" stroke-width="3" stroke-linecap="round"/>
  ${glass('M66 45 L74 35 L90 35 L90 45 Z', '#a7f3d0')}
  ${glass('M96 35 L114 35 L114 45 L96 45 Z', '#a7f3d0')}
  ${glass('M120 35 L126 35 L134 45 L120 45 Z', '#a7f3d0')}
  <path d="M98 52 h10 M103 49 v10" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
  <rect x="32" y="52" width="8" height="5" rx="1.5" fill="#fde68a" stroke="${OUT}" stroke-width="1.2"/>
  ${wheel(56, 70, 12)}
  ${wheel(128, 70, 12)}
`);

/** Crew-cab research truck with instrument box + sensors. */
const researchTruck = frame(`
  ${shadow}
  <rect x="96" y="34" width="52" height="34" rx="3" fill="#d97706" stroke="${OUT}" stroke-width="2.4"/>
  <rect x="102" y="40" width="40" height="12" rx="2" fill="#fbbf24" opacity="0.75"/>
  <rect x="102" y="56" width="40" height="6" rx="1.5" fill="#b45309"/>
  <line x1="118" y1="18" x2="118" y2="34" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
  <circle cx="114" cy="16" r="3.5" fill="#38bdf8" stroke="${OUT}" stroke-width="1.3"/>
  <circle cx="122" cy="16" r="3.5" fill="#38bdf8" stroke="${OUT}" stroke-width="1.3"/>
  <path d="M34 68 L34 52 Q34 46 42 45 L52 43 L60 34 Q62 31 68 31 L92 31 Q96 31 96 36 L96 68 Z"
        fill="#f59e0b" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>
  ${glass('M62 43 L70 34 L90 34 L90 43 Z', '#fef3c7')}
  <rect x="32" y="52" width="8" height="5" rx="1.5" fill="#fde68a" stroke="${OUT}" stroke-width="1.2"/>
  ${wheel(54, 70, 11)}
  ${wheel(114, 70, 11)}
  ${wheel(140, 70, 11)}
`);

/** Lifted chase pickup — bed rack, light bar, bull bar. */
const damagePickup = frame(`
  ${shadow}
  <path d="M78 30 Q86 18 100 18 L112 18" fill="none" stroke="#1f2937" stroke-width="3.2" stroke-linecap="round"/>
  <rect x="94" y="14" width="22" height="5.5" rx="2" fill="#0f172a" stroke="${OUT}" stroke-width="1.3"/>
  <circle cx="100" cy="16.5" r="1.8" fill="#fde68a"/>
  <circle cx="105" cy="16.5" r="1.8" fill="#fde68a"/>
  <circle cx="110" cy="16.5" r="1.8" fill="#fde68a"/>
  <path d="M32 68 L32 54 L38 50 L50 47 L60 34 Q62 30 68 30 L100 30 Q106 30 108 35 L116 48 L116 52 L152 52 L152 68 Z"
        fill="#ef4444" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>
  <rect x="114" y="46" width="40" height="6" rx="1.5" fill="#b91c1c" stroke="${OUT}" stroke-width="1.5"/>
  ${glass('M62 47 L70 34 L88 34 L88 47 Z', '#fecdd3')}
  ${glass('M94 34 L104 34 L112 47 L94 47 Z', '#fecdd3')}
  <path d="M48 58 H108" stroke="#991b1b" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M28 50 L28 64 L34 64 L34 50 Z" fill="#0f172a" stroke="${OUT}" stroke-width="1.4"/>
  <rect x="34" y="52" width="7" height="5" rx="1" fill="#fbbf24" stroke="${OUT}" stroke-width="1.2"/>
  ${wheel(58, 70, 13, '#fca5a5')}
  ${wheel(132, 70, 13, '#fca5a5')}
`);

/** Armored interceptor — mesh cage, probe arm, light bar. */
const tornadoInterceptor = frame(`
  ${shadow}
  <path d="M132 20 c5 5 2 11 -2 15 c5 -2 11 -7 14 -14 c-4 3 -9 2 -12 -1 Z" fill="#94a3b8" opacity="0.85"/>
  <path d="M70 30 Q80 16 98 16 L116 16 Q122 16 124 22" fill="none" stroke="#111827" stroke-width="3.2" stroke-linecap="round"/>
  <rect x="84" y="12" width="28" height="5.5" rx="2" fill="#0f172a" stroke="${OUT}" stroke-width="1.3"/>
  <circle cx="90" cy="14.5" r="1.8" fill="#fbbf24"/>
  <circle cx="98" cy="14.5" r="1.8" fill="#fbbf24"/>
  <circle cx="106" cy="14.5" r="1.8" fill="#fbbf24"/>
  <path d="M30 68 L30 54 L42 46 L56 44 L66 32 Q68 28 74 28 L106 28 Q112 28 114 33 L122 46 L146 50 Q152 52 152 58 L152 68 Z"
        fill="#334155" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>
  ${glass('M70 44 L78 32 L96 32 L96 44 Z', '#94a3b8')}
  ${glass('M102 32 L108 32 L116 44 L102 44 Z', '#94a3b8')}
  <path d="M42 56 H146" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
  <path d="M24 48 L24 64 L30 64 L30 48 Z" fill="#0f172a" stroke="${OUT}" stroke-width="1.4"/>
  <path d="M22 52 H34 M22 58 H34" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
  <path d="M140 38 L158 38 L158 42 L144 42 Z" fill="#0f172a" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>
  ${wheel(56, 70, 12.5, '#fecaca')}
  ${wheel(128, 70, 12.5, '#fecaca')}
`);

export const VEHICLE_SVGS: Record<string, string> = {
  starter_car: starterCar,
  radar_van: radarVan,
  rescue_suv: rescueSuv,
  research_truck: researchTruck,
  damage_pickup: damagePickup,
  tornado_interceptor: tornadoInterceptor,
};

export function vehicleSvg(key: string): string {
  return VEHICLE_SVGS[key] || VEHICLE_SVGS['starter_car'];
}
