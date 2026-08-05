# 2026-08-05 — Storm Ops UI Overhaul

Status: **implemented** (plan `storm_ops_ui_overhaul_6564508e`)

## Phase A — reliability + quiet UI

### Live (`live.component.ts`)
- Replaced mutated `Set` with `openByGroup: Record<string, string | null>` (accordion, one open per group)
- No auto-open on load; “Open nearest” / “Collapse all” chips
- Full-header tap targets; CSS `grid-template-rows` expand animation
- Skeleton while loading; “Feed offline” on image error
- Cache-bust only while a panel is open (template gates `feedSrc`)
- Deep link: `/live?cam=<id>`; “Show on map” → `/map?cam=<id>`

### Archive (`archive.component.ts`)
- Result cards / chase form use `.storm-card` (no hard purple offset shadows)
- Severity as thin left rail; badges capped at scope + event code
- Office/source moved to footer metadata row
- Removed emoji hero / diagonal stripe header
- Filters: collapsible drawer on mobile, sticky sidebar on `md+`
- Pagination kept; denser scannable rows

## Phase B — Map hub

### Map (`map.component.ts`) + `weather.service.ts`
- Default center northern Maine / St. John Valley (`47.05, -68.35`)
- Layer chips: Radar (n0r), Radar+ (n0q), Warnings WMS, LSR GeoJSON, SPC day-1, Cams
- Base chips: Street / Dark (Carto) / Imagery (Esri)
- Cam markers from `/api/cams` (geo-tagged only); fake trackers/stats/MDOT pins removed
- “Active near you” from `/api/alerts`; cam list with Live deep links
- Mobile bottom sheet for layers + nearby; desktop right rail
- Persist center/zoom/base/layers in `sessionStorage`
- Query params: `?cam=`, `?focus=alert&id=`

### Alerts
- “Show on map” → `/map?focus=alert&id=…`

## Phase C — Nav

- Desktop: full nav unchanged
- Mobile bottom tabs: **Map · Alerts · Live · Archive** + **More** (Home / Learn / Play)

## Build

`ng build --configuration=development` succeeded after typing empty GeoJSON FeatureCollections in `WeatherService`.
