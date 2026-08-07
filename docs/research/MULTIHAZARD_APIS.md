# Multi-Hazard APIs

> Back to: [Research Index](./README.md)

External data sources for non-weather hazards — flood gauges, earthquake activity, and future fire/smoke feeds.

---

## 1. NOAA NWPS / AHPS (api.water.noaa.gov)

**Flood gauge observations for the St. John / Aroostook corridor.**

| Property | Value |
|----------|-------|
| Base URL | `https://api.water.noaa.gov` |
| Gauge URL | `https://api.water.noaa.gov/nwps/v1/gauges/{lid}` |
| Public URL | `https://water.noaa.gov/gauges/{lid}` |
| Auth | None |
| Format | JSON |
| Rate limit | None documented |

### Implementation notes

- **NWPS** = National Water Prediction Service
- **AHPS** = Advanced Hydrologic Prediction Service
- Corridor gauges monitored: DICM1, NINM1, ALLM1, FTKM1, FIHM1, MASM1, WSHM1, LMRM1, SJEB3
- Source URL for each gauge: `https://water.noaa.gov/gauges/{LID}`
- Shared live `Incident` model (`kind`, source, lat/lon, severity, meta)

### Backend code

- `backend/internal/hazards/client.go` — NWPS gauge client

---

## Monitored flood gauges

| Gauge ID | Location | Notes |
|----------|----------|-------|
| DICM1 | Dickey, ME | St. John River headwaters |
| NINM1 | Ninemile Bridge, ME | St. John River |
| ALLM1 | Allagash, ME | Allagash River |
| FTKM1 | Fort Kent, ME | St. John River |
| FIHM1 | Fish River, ME | Fish River |
| MASM1 | Masardis, ME | Aroostook River |
| WSHM1 | Washburn, ME | Aroostook River |
| LMRM1 | Limestone, ME | Aroostook River area |
| SJEB3 | St. John, NB | Canadian side |

---

## 2. USGS FDSN (earthquake.usgs.gov)

**Earthquake activity for the Maine region.**

| Property | Value |
|----------|-------|
| Base URL | `https://earthquake.usgs.gov` |
| Query URL | `https://earthquake.usgs.gov/fdsnws/event/1/query` |
| Auth | None |
| Format | JSON (GeoJSON) |
| Rate limit | None documented |

### Query parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `format` | `geojson` | Output format |
| `minmagnitude` | `2.5` | Minimum magnitude (M≥2.5) |
| `starttime` | (7 days ago) | Lookback window |
| `endtime` | (now) | Current time |
| `minlatitude` / `maxlatitude` | ME bbox | Bounding box for Maine |
| `minlongitude` / `maxlongitude` | ME bbox | Bounding box for Maine |

### Implementation notes

- Queries M≥2.5 earthquakes within the Maine bounding box for the past 7 days.
- Shared live `Incident` model (`kind=quake`, source, lat/lon, severity, meta).
- Overview: quake count badge.
- Map: Quakes layer with markers.

### Backend code

- `backend/internal/hazards/client.go` — `usgsQuakeURL` constant + query builder

---

## 3. Fire / Smoke (deferred)

**No stable open feed currently available.**

| Property | Value |
|----------|-------|
| Status | ⏳ Deferred — no stable open feed wired |
| Potential sources | NOAA Hazard Mapping System, EPA AirNow, IQAir |

### Implementation notes

- Listed in the Ops Expansion Roadmap (Phase D) as a follow-up.
- Will be wired when a stable open feed is available.
- Would use the shared `Incident` model (`kind=fire` or `kind=smoke`).

---

## 4. Winter Roads / Marine (deferred)

**Winter road conditions and marine forecasts — not yet wired.**

| Property | Value |
|----------|-------|
| Status | ⏳ Deferred — feeds not yet available |
| Potential sources | NWS marine forecasts, Maine DOT winter road conditions |

### Implementation notes

- Listed in the Ops Expansion Roadmap (Phase D) as a follow-up.
- Will be wired when feeds allow.

---

## Shared Incident model

All hazards use a shared live `Incident` model:

| Field | Type | Description |
|-------|------|-------------|
| `kind` | string | `flood` / `quake` / `fire` / `smoke` |
| `source` | string | Data source (e.g., `NOAA NWPS`, `USGS FDSN`) |
| `lat` / `lon` | float64 | Incident location |
| `severity` | string | Severity level |
| `meta` | map | Additional source-specific metadata |

---

## API endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/hazards` | All hazards (flood + quakes) |
| `GET /api/hazards/flood` | Flood gauge incidents only |
| `GET /api/hazards/quakes` | Earthquake incidents only |
| `GET /api/hazards/geo` | All hazards as GeoJSON for map |

---

## Map layers

- **Flood** layer: gauge markers with severity indicators
- **Quakes** layer: earthquake markers with magnitude
- Overview badges: flood actionable / gauge count + quake count
- Watched-area expand returns nearby flood/quake incidents

---

## Desk watch-zone score

The desk watch-zone score includes hazard components:

| Component | Max points | Notes |
|-----------|------------|-------|
| Alerts | 40 | NWS active warnings |
| Outage | 25 | ME ODIN meters |
| Cams | 20 | Near-warning cameras |
| Flood | 15 | Actionable flood gauges |

No ME ODIN inflation when uncovered (honest empty state).

---

## Related documents

- [Weather & Alert APIs](./WEATHER_ALERT_APIS.md) — NWS alerts for hazard correlation
- [Outage APIs](./OUTAGE_APIS.md) — Outage component in desk score
- [Internal API Endpoints](./INTERNAL_API_ENDPOINTS.md) — `/api/hazards/*` routes
- [Ops Expansion Roadmap](../OPS_EXPANSION_ROADMAP.md) — Phase D (multi-hazard) plan