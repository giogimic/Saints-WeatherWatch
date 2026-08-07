# Map & Visualization Tools

> Back to: [Research Index](./README.md)

Frontend libraries, map basemaps, and UI frameworks used to render the weather dashboard and Storm World game.

---

## 1. Leaflet + ngx-leaflet

**Open-source interactive map library with Angular bindings.**

| Property | Value |
|----------|-------|
| Library | Leaflet.js |
| Angular wrapper | ngx-leaflet |
| Version | Phase 3+ |
| License | BSD-2-Clause |

### Implementation notes

- **Default center:** Northern Maine / St. John Valley (`47.05, -68.35`)
- **Layer chips:** Radar (n0r), Radar+ (n0q), Warnings WMS, LSR GeoJSON, SPC day-1, Cams
- **Base chips:** Street / Dark (CARTO) / Imagery (Esri)
- **Cam markers:** From `/api/cams` (geo-tagged only)
- **Persist:** Center/zoom/base/layers in `sessionStorage`
- **Query params:** `?cam=`, `?focus=alert&id=`
- **Storm World:** Leaflet mini-map with live IEM NEXRAD radar overlay; player marker = equipped garage truck SVG
- **Memory optimization:** Peer/drop markers use `setIcon(...)` only when content changes (was causing DOM churn / memory leak when called every 100ms)

### Frontend code

- `frontend/src/app/features/map/map.component.ts` — Main map hub
- `frontend/src/app/features/play/play.component.ts` — Radar Chase mini-map

---

## 2. OpenStreetMap (Street basemap)

**Default street-level basemap.**

| Property | Value |
|----------|-------|
| URL | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` |
| Auth | None |
| License | ODbL (attribution required) |

### Implementation notes

- Default "Street" base layer chip.
- Attribution included in map UI.

---

## 3. CARTO (Dark basemap)

**Dark-themed basemap for night/ops viewing.**

| Property | Value |
|----------|-------|
| URL | `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png` |
| Auth | None |
| License | CARTO + ODbL |

### Implementation notes

- "Dark" base layer chip.
- Preferred for ops/storm tracking (high contrast with weather overlays).

---

## 4. Esri (Imagery basemap)

**Satellite imagery basemap.**

| Property | Value |
|----------|-------|
| URL | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` |
| Auth | None |
| License | Esri terms |

### Implementation notes

- "Imagery" base layer chip.
- Useful for terrain/land-cover context during storm chasing.

---

## 5. Tailwind CSS 3 + DaisyUI 4

**Utility-first CSS framework with component library.**

| Property | Value |
|----------|-------|
| Framework | Tailwind CSS 3 |
| Component lib | DaisyUI 4 |
| Theme | Custom "stormops" dark theme |
| Config | `frontend/tailwind.config.js` |

### Implementation notes

- Custom "stormops" dark theme for the storm-chaser-inspired interface.
- PostCSS configured via `frontend/.postcssrc.json`.
- Global styles in `frontend/src/styles.scss`.

### Frontend code

- `frontend/tailwind.config.js` — Tailwind + DaisyUI config
- `frontend/.postcssrc.json` — PostCSS plugins
- `frontend/src/styles.scss` — Global styles

---

## 6. Angular 18

**Frontend SPA framework.**

| Property | Value |
|----------|-------|
| Version | Angular 18+ |
| Features | Standalone components, signals, lazy routes |
| Build | `ng build` |
| Dev server | `npm start` (port 4200, proxies `/api` → `:8080`) |

### Feature modules

| Feature | Route | Component |
|---------|-------|-----------|
| Home | `/` | `home.component.ts` |
| Map | `/map` | `map.component.ts` |
| Alerts | `/alerts` | `alerts.component.ts` |
| Live | `/live` | `live.component.ts` |
| Learn | `/learn` | `learn.component.ts` |
| Play | `/play` | `play.component.ts` |

### Key services

| Service | Purpose |
|---------|---------|
| `AuthService` | Chaser auth (name+PIN, cookie session) |
| `OpsStateService` | Shared alerts/cams/favorites/areas state |
| `RealtimeService` | WebSocket connection to `/ws` with backoff reconnect |
| `WeatherService` | Map layer data, GeoJSON, WMS URLs |

### Frontend code

- `frontend/src/app/app.routes.ts` — Lazy route definitions
- `frontend/src/app/app.component.ts` — Root component
- `frontend/src/app/features/` — Feature components

---

## 7. SVG Vehicle Assets

**Cartoon vehicle SVGs for the garage and Radar Chase game.**

| Vehicle | Key | Notes |
|---------|-----|-------|
| Starter Car | `starter_car` | Default vehicle |
| Radar Van | `radar_van` | Unlocked by chaser level |
| Rescue SUV | `rescue_suv` | Unlocked by quiz track |
| Research Truck | `research_truck` | Unlocked by chaser level |
| Damage Pickup | `damage_pickup` | Unlocked by chaser level |
| Tornado Interceptor | `tornado_interceptor` | Unlocked by chaser level |

### Implementation notes

- Player marker in Radar Chase = equipped garage truck SVG.
- Vehicle unlocks are server-side (chaser level / quiz tracks).

---

## Map layer system

| Layer | Source | Chip name | Notes |
|-------|--------|-----------|-------|
| Base Reflectivity | IEM WMS n0r | Radar | Default radar |
| Reflectivity HD | IEM WMS n0q | Radar+ | Higher resolution |
| Warnings WMS | NWS alerts | Warnings | Active warning polygons |
| LSR GeoJSON | IEM | LSR | Local Storm Reports |
| SPC Day-1 | SPC | SPC day-1 | Convective outlook |
| Cams | `/api/cams` | Cams | Geo-tagged cameras |
| Outages | `/api/outages/geo` | Outages | County choropleth |
| Flood | `/api/hazards/flood` | Flood | Gauge markers |
| Quakes | `/api/hazards/quakes` | Quakes | Earthquake markers |

### Layer persistence

- Unified map layer CSV defaults via dashboard prefs + `sessionStorage`.
- Impact mode toggle (Live + Map) focuses warnings/outages/flood/cams.

---

## Related documents

- [Backend & Infrastructure Tools](./BACKEND_INFRASTRUCTURE_TOOLS.md) — Go, Prisma, Docker
- [Internal API Endpoints](./INTERNAL_API_ENDPOINTS.md) — All backend routes
- [Game Layer Systems](./GAME_LAYER_SYSTEMS.md) — Storm World map usage