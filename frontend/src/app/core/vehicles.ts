/** Stable vehicle keys for rewards + future map chase game. */
export const VEHICLE_SVGS: Record<string, string> = {
  starter_car: `<svg viewBox="0 0 80 48" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="20" width="56" height="16" rx="4" fill="#38bdf8"/><path d="M18 20l8-10h20l10 10" fill="#7dd3fc"/><circle cx="22" cy="38" r="6" fill="#1e293b"/><circle cx="54" cy="38" r="6" fill="#1e293b"/><rect x="28" y="12" width="14" height="8" rx="1" fill="#0ea5e9"/></svg>`,
  radar_van: `<svg viewBox="0 0 80 48" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="16" width="52" height="20" rx="3" fill="#a78bfa"/><rect x="44" y="10" width="22" height="26" rx="2" fill="#8b5cf6"/><circle cx="20" cy="38" r="6" fill="#1e293b"/><circle cx="52" cy="38" r="6" fill="#1e293b"/><circle cx="55" cy="8" r="5" fill="none" stroke="#fbbf24" stroke-width="2"/><path d="M55 3v3M55 10v3M50 8h3M57 8h3" stroke="#fbbf24" stroke-width="1.5"/></svg>`,
  rescue_suv: `<svg viewBox="0 0 80 48" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="18" width="54" height="18" rx="5" fill="#34d399"/><path d="M16 18l6-8h24l10 8" fill="#6ee7b7"/><circle cx="24" cy="38" r="6" fill="#1e293b"/><circle cx="52" cy="38" r="6" fill="#1e293b"/><rect x="34" y="22" width="10" height="6" fill="#fef3c7"/></svg>`,
  research_truck: `<svg viewBox="0 0 80 48" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="20" width="40" height="16" rx="2" fill="#f59e0b"/><rect x="48" y="14" width="22" height="22" rx="2" fill="#d97706"/><circle cx="22" cy="38" r="6" fill="#1e293b"/><circle cx="56" cy="38" r="6" fill="#1e293b"/><rect x="52" y="18" width="12" height="8" fill="#38bdf8" opacity=".8"/></svg>`,
  damage_pickup: `<svg viewBox="0 0 80 48" xmlns="http://www.w3.org/2000/svg"><rect x="28" y="16" width="28" height="18" rx="3" fill="#fb7185"/><rect x="6" y="24" width="24" height="12" rx="1" fill="#f43f5e"/><circle cx="20" cy="38" r="6" fill="#1e293b"/><circle cx="50" cy="38" r="6" fill="#1e293b"/><path d="M34 12h8l4 6h-16z" fill="#fda4af"/></svg>`,
  tornado_interceptor: `<svg viewBox="0 0 80 48" xmlns="http://www.w3.org/2000/svg"><path d="M10 28h50l8-8H22z" fill="#ef4444"/><rect x="14" y="20" width="40" height="12" rx="2" fill="#dc2626"/><circle cx="24" cy="36" r="5" fill="#1e293b"/><circle cx="52" cy="36" r="5" fill="#1e293b"/><path d="M40 8c4 6 2 10 0 14 4-2 8-6 10-12-4 2-8 2-10-2z" fill="#94a3b8"/></svg>`,
};

export function vehicleSvg(key: string): string {
  return VEHICLE_SVGS[key] || VEHICLE_SVGS['starter_car'];
}
