/** Stable vehicle keys for rewards + future map chase game.
 * Side-view cartoon art, hand-authored so it stays original and scales cleanly.
 */

const OUTLINE = '#0b1120';

function frame(inner: string): string {
  return `<svg viewBox="0 0 200 120" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

const shadow = `<ellipse cx="100" cy="108" rx="82" ry="7" fill="#020617" opacity="0.35"/>`;

/** Treaded wheel with rim spokes. */
function wheel(cx: number, cy: number, r: number, rim = '#e2e8f0'): string {
  const tread = Math.max(4, r * 0.3);
  const spokes = [0, 60, 120, 240, 300].map(deg => {
    const a = (deg * Math.PI) / 180;
    const inner = r * 0.22;
    const outer = r * 0.46;
    return `<line x1="${(cx + Math.cos(a) * inner).toFixed(1)}" y1="${(cy + Math.sin(a) * inner).toFixed(1)}" x2="${(cx + Math.cos(a) * outer).toFixed(1)}" y2="${(cy + Math.sin(a) * outer).toFixed(1)}" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>`;
  }).join('');
  return `<g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#1f2937" stroke="${OUTLINE}" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.83).toFixed(1)}" fill="none" stroke="#111827" stroke-width="${tread.toFixed(1)}" stroke-dasharray="6 8"/>
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.55).toFixed(1)}" fill="${rim}" stroke="#64748b" stroke-width="2"/>
    ${spokes}
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.16).toFixed(1)}" fill="#475569"/>
  </g>`;
}

/** Diagonal shine streak clipped to the glass shape. */
function glass(path: string, id: string, fill = '#bae6fd'): string {
  return `<g>
    <clipPath id="${id}"><path d="${path}"/></clipPath>
    <path d="${path}" fill="${fill}" stroke="${OUTLINE}" stroke-width="2.5" stroke-linejoin="round"/>
    <g clip-path="url(#${id})" opacity="0.55">
      <path d="M-40 60 L20 -20 L36 -20 L-24 60 Z" fill="#ffffff"/>
      <path d="M0 60 L60 -20 L70 -20 L10 60 Z" fill="#ffffff"/>
    </g>
  </g>`;
}

const starterCar = frame(`
  ${shadow}
  <path d="M22 82 L22 66 Q22 58 32 56 L54 52 L70 34 Q74 28 82 28 L120 28 Q128 28 132 34 L146 54 L168 59 Q178 61 178 70 L178 82 Z"
        fill="#38bdf8" stroke="${OUTLINE}" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M26 72 H174" stroke="#0ea5e9" stroke-width="4" stroke-linecap="round"/>
  ${glass('M76 52 L88 33 L108 33 L108 52 Z', 'g-car-a')}
  ${glass('M114 33 L128 33 L140 52 L114 52 Z', 'g-car-b')}
  <rect x="20" y="64" width="12" height="8" rx="3" fill="#fde68a" stroke="${OUTLINE}" stroke-width="2"/>
  <rect x="170" y="64" width="9" height="8" rx="3" fill="#f87171" stroke="${OUTLINE}" stroke-width="2"/>
  <path d="M60 82 H140" stroke="#0369a1" stroke-width="3" opacity="0.5"/>
  ${wheel(62, 86, 17)}
  ${wheel(146, 86, 17)}
`);

const radarVan = frame(`
  ${shadow}
  <rect x="112" y="18" width="6" height="20" rx="2" fill="#475569" stroke="${OUTLINE}" stroke-width="2"/>
  <ellipse cx="115" cy="16" rx="20" ry="7" fill="#fbbf24" stroke="${OUTLINE}" stroke-width="2.5"/>
  <path d="M138 10 a14 14 0 0 1 0 14" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M146 6 a20 20 0 0 1 0 22" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
  <path d="M20 82 L20 62 Q20 54 30 52 L44 50 L58 36 Q62 30 70 30 L162 30 Q174 30 174 42 L174 82 Z"
        fill="#a78bfa" stroke="${OUTLINE}" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M24 70 H170" stroke="#8b5cf6" stroke-width="5" stroke-linecap="round"/>
  ${glass('M62 50 L74 35 L92 35 L92 50 Z', 'g-van-a', '#ddd6fe')}
  ${glass('M100 35 L124 35 L124 50 L100 50 Z', 'g-van-b', '#ddd6fe')}
  ${glass('M132 35 L156 35 L156 50 L132 50 Z', 'g-van-c', '#ddd6fe')}
  <rect x="18" y="60" width="12" height="8" rx="3" fill="#fde68a" stroke="${OUTLINE}" stroke-width="2"/>
  ${wheel(58, 86, 17)}
  ${wheel(146, 86, 17)}
`);

const rescueSuv = frame(`
  ${shadow}
  <rect x="76" y="20" width="52" height="9" rx="4" fill="#0f172a" stroke="${OUTLINE}" stroke-width="2"/>
  <rect x="80" y="22" width="20" height="5" rx="2" fill="#ef4444"/>
  <rect x="104" y="22" width="20" height="5" rx="2" fill="#3b82f6"/>
  <path d="M20 82 L20 64 Q20 56 30 54 L46 51 L62 32 Q66 29 74 29 L138 29 Q148 29 152 36 L164 54 L172 58 Q180 61 180 70 L180 82 Z"
        fill="#34d399" stroke="${OUTLINE}" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M24 71 H176" stroke="#10b981" stroke-width="5" stroke-linecap="round"/>
  ${glass('M66 51 L78 34 L96 34 L96 51 Z', 'g-suv-a', '#d1fae5')}
  ${glass('M104 34 L128 34 L128 51 L104 51 Z', 'g-suv-b', '#d1fae5')}
  ${glass('M136 34 L146 34 L158 51 L136 51 Z', 'g-suv-c', '#d1fae5')}
  <path d="M108 60 h14 M115 56 v13" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
  <rect x="18" y="62" width="12" height="8" rx="3" fill="#fde68a" stroke="${OUTLINE}" stroke-width="2"/>
  ${wheel(60, 86, 18)}
  ${wheel(148, 86, 18)}
`);

const researchTruck = frame(`
  ${shadow}
  <rect x="104" y="24" width="76" height="56" rx="6" fill="#d97706" stroke="${OUTLINE}" stroke-width="3.5"/>
  <rect x="112" y="34" width="60" height="20" rx="3" fill="#fbbf24" opacity="0.7"/>
  <rect x="112" y="60" width="60" height="10" rx="3" fill="#b45309"/>
  <rect x="130" y="8" width="5" height="18" rx="2" fill="#475569" stroke="${OUTLINE}" stroke-width="2"/>
  <circle cx="126" cy="8" r="5" fill="#38bdf8" stroke="${OUTLINE}" stroke-width="2"/>
  <circle cx="140" cy="8" r="5" fill="#38bdf8" stroke="${OUTLINE}" stroke-width="2"/>
  <path d="M20 80 L20 60 Q20 52 30 50 L42 48 L56 32 Q60 28 68 28 L96 28 Q104 28 104 36 L104 80 Z"
        fill="#f59e0b" stroke="${OUTLINE}" stroke-width="3.5" stroke-linejoin="round"/>
  ${glass('M60 48 L72 33 L94 33 L94 48 Z', 'g-truck-a', '#fef3c7')}
  <rect x="18" y="58" width="12" height="8" rx="3" fill="#fde68a" stroke="${OUTLINE}" stroke-width="2"/>
  ${wheel(56, 86, 17)}
  ${wheel(132, 86, 17)}
  ${wheel(168, 86, 17)}
`);

const damagePickup = frame(`
  ${shadow}
  <path d="M74 32 Q84 14 104 14 L120 14" fill="none" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/>
  <rect x="96" y="8" width="30" height="8" rx="3" fill="#0f172a" stroke="${OUTLINE}" stroke-width="2"/>
  <circle cx="104" cy="12" r="3" fill="#fde68a"/>
  <circle cx="112" cy="12" r="3" fill="#fde68a"/>
  <circle cx="120" cy="12" r="3" fill="#fde68a"/>
  <path d="M18 80 L18 62 L26 56 L44 52 L60 30 Q64 25 72 25 L112 25 Q120 25 124 31 L136 52 L136 58 L182 58 L182 80 Z"
        fill="#ef4444" stroke="${OUTLINE}" stroke-width="3.5" stroke-linejoin="round"/>
  <rect x="134" y="52" width="50" height="8" rx="3" fill="#dc2626" stroke="${OUTLINE}" stroke-width="2.5"/>
  ${glass('M64 52 L76 30 L96 30 L96 52 Z', 'g-pk-a', '#fecdd3')}
  ${glass('M104 30 L118 30 L130 52 L104 52 Z', 'g-pk-b', '#fecdd3')}
  <path d="M40 70 H130" stroke="#b91c1c" stroke-width="4" stroke-linecap="round"/>
  <path d="M60 80 H128" stroke="#cbd5e1" stroke-width="5" stroke-linecap="round"/>
  <path d="M14 58 L14 76 L20 76 L20 58 Z" fill="#0f172a" stroke="${OUTLINE}" stroke-width="2"/>
  <rect x="20" y="60" width="10" height="8" rx="2" fill="#fbbf24" stroke="${OUTLINE}" stroke-width="2"/>
  ${wheel(62, 84, 22, '#fca5a5')}
  ${wheel(154, 84, 22, '#fca5a5')}
`);

const tornadoInterceptor = frame(`
  ${shadow}
  <path d="M150 16 c8 8 4 16 -2 22 c8 -3 16 -10 20 -20 c-6 4 -14 3 -18 -2 Z" fill="#94a3b8" opacity="0.85"/>
  <path d="M70 30 Q82 12 104 12 L126 12 Q136 12 140 20" fill="none" stroke="#111827" stroke-width="5" stroke-linecap="round"/>
  <rect x="86" y="6" width="40" height="8" rx="3" fill="#0f172a" stroke="${OUTLINE}" stroke-width="2"/>
  <circle cx="94" cy="10" r="3" fill="#fbbf24"/>
  <circle cx="104" cy="10" r="3" fill="#fbbf24"/>
  <circle cx="114" cy="10" r="3" fill="#fbbf24"/>
  <path d="M14 80 L14 62 L30 50 L56 46 L72 28 Q76 23 84 23 L118 23 Q126 23 130 29 L142 48 L170 54 Q180 57 180 68 L180 80 Z"
        fill="#334155" stroke="${OUTLINE}" stroke-width="3.5" stroke-linejoin="round"/>
  ${glass('M76 46 L88 28 L110 28 L110 46 Z', 'g-int-a', '#94a3b8')}
  ${glass('M118 28 L126 28 L138 46 L118 46 Z', 'g-int-b', '#94a3b8')}
  <path d="M30 66 H170" stroke="#ef4444" stroke-width="5" stroke-linecap="round"/>
  <path d="M8 56 L8 78 L16 78 L16 56 Z" fill="#0f172a" stroke="${OUTLINE}" stroke-width="2"/>
  <path d="M6 62 H24 M6 72 H24" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
  <path d="M164 40 L188 40 L188 46 L168 46 Z" fill="#0f172a" stroke="${OUTLINE}" stroke-width="2.5" stroke-linejoin="round"/>
  ${wheel(58, 84, 20, '#fecaca')}
  ${wheel(150, 84, 20, '#fecaca')}
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
