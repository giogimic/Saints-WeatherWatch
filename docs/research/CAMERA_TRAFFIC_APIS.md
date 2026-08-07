# Camera & Traffic APIs

> Back to: [Research Index](./README.md)

External data sources for live camera feeds — traffic, aviation, satellite imagery, and river/waterway cameras across the Maine / St. John Valley corridor.

---

## 1. OpenCCTV (opencctv.org)

**Primary camera discovery service — runtime tiled discovery for the corridor.**

| Property | Value |
|----------|-------|
| Base URL | `https://opencctv.org` |
| Discovery URL | `https://opencctv.org/api/cameras?bounds={bbox}` |
| Source URL | `https://opencctv.org/cameras` |
| Auth | None |
| Format | JSON |
| Rate limit | None documented |

### Implementation notes

- **Runtime tiled discovery:** Backend tiles the corridor bounds and queries OpenCCTV for cameras in each tile.
- **Hourly refresh:** Discovery runs every 3600s (1 hour).
- **Fallback list:** Committed `backend/internal/cams/fallback.json` provides a static fallback if discovery fails.
- **Sources discovered:** FAA, NB 511, NE 511, USGS Dickey, FKOC, Smyrna I-95, and more.
- **Dead URLs removed:** Old MDOT and GOES-16 URLs were removed; GOES-19 + NOAA radar kept as static imagery.

### Backend code

- `backend/internal/cams/cache.go` — OpenCCTV discovery + fallback list
- `backend/internal/cams/discover.go` — Tiled discovery logic

### Config

```
CAM_DISCOVER_INTERVAL_SEC=3600
```

---

## 2. FAA Weathercams (weathercams.faa.gov)

**Aviation weather cameras from the Federal Aviation Administration.**

| Property | Value |
|----------|-------|
| Base URL | `https://weathercams.faa.gov` |
| Auth | None |
| Format | JSON |
| Referer | `https://weathercams.faa.gov/` |

### Endpoints used

| URL | Purpose |
|-----|---------|
| `https://weathercams.faa.gov/api/sites` | List all FAA camera sites |
| `https://weathercams.faa.gov/api/summary?siteId={id}&related=true` | Get camera summary + related feeds |

### Implementation notes

- FAA cameras use a custom URL scheme: `faa-weathercam://ID` resolved via the API.
- Image URLs are validated to be from `weathercams.faa.gov` or `wcams-static.faa.gov`.
- FAA referer header set for image fetches.

### Backend code

- `backend/internal/cams/cache.go` — FAA site list + summary fetch + URL resolution

---

## 3. NE 511 — New England Traffic Cameras

**State DOT traffic cameras via OpenCCTV discovery (no separate scraper).**

| Property | Value |
|----------|-------|
| Source | Discovered via OpenCCTV |
| Auth | None |
| Format | Image URL (MJPEG/JPEG) |

### Implementation notes

- NE 511 cameras are discovered through OpenCCTV tiled discovery — no separate scraper needed.
- Corridor tagging: I-95 North corridor.
- Health monitoring: last frame age, black-frame detection, stale/error status.

---

## 4. NB 511 — New Brunswick Traffic Cameras

**New Brunswick, Canada DOT traffic cameras via OpenCCTV discovery.**

| Property | Value |
|----------|-------|
| Source | Discovered via OpenCCTV |
| Auth | None |
| Format | Image URL (MJPEG/JPEG) |

### Implementation notes

- NB 511 cameras discovered through OpenCCTV tiled discovery.
- Corridor tagging: NB border corridor.
- Part of the Canada-side coverage for the St. John Valley border region.

---

## 5. USGS Dickey Camera

**USGS water/river monitoring camera.**

| Property | Value |
|----------|-------|
| Source | Discovered via OpenCCTV / fallback list |
| Auth | None |
| Format | Image URL |

### Implementation notes

- Listed in the fallback camera list.
- Part of the waterway monitoring coverage.

---

## 6. Other Camera Sources

Additional cameras discovered via OpenCCTV or in the fallback list:

| Source | Type | Notes |
|--------|------|-------|
| FKOC | Traffic/scenic | In fallback list |
| Smyrna I-95 | Traffic | In fallback list |
| GOES-19 GeoColor | Satellite | Static imagery (see [Radar & Satellite](./RADAR_SATELLITE_APIS.md)) |
| GOES-19 Channel 13 | Satellite IR | Static imagery |
| NOAA RIDGE NE | Radar mosaic | Static imagery |

---

## Camera health monitoring

The backend enriches every camera with health metadata:

| Field | Values | Description |
|-------|--------|-------------|
| `health` | `ok` / `stale` / `black` / `pending` / `error` | Overall health status |
| `lastUpdated` | timestamp | Last successful frame fetch |
| `ageSec` | integer | Seconds since last frame |
| `blackFrame` | boolean | Black-frame detected via luma mean/variance sampling |

### Health detection methods

1. **Black-frame detection:** Luma mean/variance sampling after image fetch.
2. **Stale detection:** Frame age exceeds threshold.
3. **Error detection:** Consecutive fetch-fail counter → error health.
4. **Pending:** Initial state before first fetch.

---

## Corridor tagging

Cameras are grouped by corridor for the Live page:

| Corridor | Coverage |
|----------|----------|
| St. John Valley | Northern Maine / St. John River area |
| Caribou / Aroostook | Central Aroostook County |
| I-95 North | Interstate 95 corridor |
| NB border | New Brunswick, Canada side |
| Outer | Beyond primary corridors |

---

## Near-warning enrichment

- `GET /api/cams` enriches each camera with `nearAlertIds` from live NWS alerts (~40 mi radius).
- `GET /api/cams/near-warnings` returns cameras near active warnings.
- Watched-area expand returns `cams` in radius.

---

## API endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/cams` | All cameras with health + near-alert enrichment |
| `GET /api/cams/near-warnings` | Cameras near active NWS warnings |
| `GET /api/cams/corridors` | Cameras grouped by corridor |

---

## Related documents

- [Radar & Satellite APIs](./RADAR_SATELLITE_APIS.md) — GOES-19, NOAA RIDGE (also in cam list)
- [Weather & Alert APIs](./WEATHER_ALERT_APIS.md) — NWS alerts for near-warning enrichment
- [Internal API Endpoints](./INTERNAL_API_ENDPOINTS.md) — `/api/cams/*` routes