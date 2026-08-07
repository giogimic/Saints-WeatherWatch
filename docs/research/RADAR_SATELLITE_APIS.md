# Radar & Satellite APIs

> Back to: [Research Index](./README.md)

External data sources for NEXRAD radar products (reflectivity, velocity), RIDGE imagery, and GOES-19 satellite imagery.

---

## 1. IEM NEXRAD WMS (mesonet.agron.iastate.edu)

**Primary radar source — WMS tiles for reflectivity and loop animations.**

| Property | Value |
|----------|-------|
| Base URL | `https://mesonet.agron.iastate.edu` |
| Auth | None |
| Format | WMS / WMS-T (time-enabled) |
| Rate limit | None documented |

### WMS endpoints used

| URL | Product | Description |
|-----|---------|-------------|
| `https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi` | N0R (Base Reflectivity) | Standard reflectivity |
| `https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi` | N0Q (Reflectivity HD) | Higher-resolution reflectivity |
| `https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r-t.cgi` | N0R-T (Reflectivity loop) | Time-enabled WMS for animation |
| `https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q-t.cgi` | N0Q-T (Reflectivity HD loop) | Time-enabled WMS for HD animation |

### Implementation notes

- **Reflectivity:** Uses IEM WMS (+ WMS-T loop for timelapse).
- **Velocity:** IEM `n0u` velocity WMS is currently empty/broken — N0S RIDGE is the working velocity product.
- **Map layer chips:** Radar (n0r), Radar+ (n0q) — HD is a product choice, not a separate chip.
- **Loop/scrub:** WMS-T provides composite loop + scrubber on the radar desk HUD.
- **Radar Chase game:** Leaflet mini-map uses live IEM NEXRAD radar overlay.

### Backend code

- `backend/internal/radar/client.go` — IEM radar JSON, WMS URLs, RIDGE worldfile bounds

### Config

```
IEM_REPORT_INTERVAL_SEC=120
```

---

## 2. IEM RIDGE Images

**Static radar image tiles with worldfile bounds for overlay.**

| Property | Value |
|----------|-------|
| Base URL | `https://mesonet.agron.iastate.edu/data/gis/images/4326/ridge` |
| Auth | None |
| Format | PNG + worldfile |

### URL patterns

| URL | Purpose |
|-----|---------|
| `https://mesonet.agron.iastate.edu/data/gis/images/4326/ridge` | Base path for RIDGE tiles |
| `https://mesonet.agron.iastate.edu/data/gis/images/4326/ridge/%s/%s_0.png` | Latest RIDGE product (site/product) |
| `https://mesonet.agron.iastate.edu/archive/data/%s/GIS/ridge/%s/%s/%s_%s_%s.png` | Archived RIDGE frames |

### Implementation notes

- RIDGE worldfile bounds fetched from IEM for proper image overlay positioning.
- Velocity uses RIDGE N0S image overlay + archive frames.
- Archive URL pattern: `{date}/GIS/ridge/{site}/{product}/{site}_{product}_{timestamp}.png`
- Example: `https://mesonet.agron.iastate.edu/archive/data/2026/08/06/GIS/ridge/CBW/N0S/CBW_N0S_202608060429.png`

### Backend code

- `backend/internal/radar/client.go` — RIDGE URL builders + worldfile bounds

---

## 3. IEM Radar JSON

**Metadata endpoint for available radar products and sites.**

| Property | Value |
|----------|-------|
| URL | `https://mesonet.agron.iastate.edu/json/radar` |
| Auth | None |
| Format | JSON |

### Implementation notes

- Provides list of available NEXRAD sites and products.
- Used to determine nearest NEXRAD site (CBW — Caribou, ME for St. John Valley).
- Status includes: nearest NEXRAD, product catalog, latest scan age.

### Backend code

- `backend/internal/radar/client.go` — `iemRadarJSON` constant

---

## 4. NOAA RIDGE (radar.weather.gov)

**Static radar imagery from NOAA's RIDGE system.**

| Property | Value |
|----------|-------|
| Base URL | `https://radar.weather.gov/ridge/standard/` |
| Auth | None |
| Format | GIF/PNG |

### Products used

| URL | Product |
|-----|---------|
| `https://radar.weather.gov/ridge/standard/NORTHEAST_0.gif` | Northeast regional radar mosaic |

### Implementation notes

- Used as a static imagery fallback in the camera/imagery list.
- Optional: single-site reflectivity RIDGE (N0B) as a fourth product.

### Backend code

- `backend/internal/cams/cache.go` — static imagery entries

---

## 5. NOAA GOES-19 Satellite (cdn.star.nesdis.noaa.gov)

**Geostationary satellite imagery for the Northeast sector.**

| Property | Value |
|----------|-------|
| Base URL | `https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ne/` |
| Source URL | `https://www.star.nesdis.noaa.gov/GOES/` |
| Auth | None |
| Format | JPG |

### Products used

| URL | Product |
|-----|---------|
| `https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ne/GEOCOLOR/latest.jpg` | GeoColor (true-color visible) |
| `https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ne/13/latest.jpg` | Channel 13 (Clean IR / infrared) |

### Implementation notes

- GOES-19 replaced the old GOES-16 URLs (which were dead).
- Both products are in the camera/imagery list as static feeds.
- Source attribution: `https://www.star.nesdis.noaa.gov/GOES/`

### Backend code

- `backend/internal/cams/cache.go` — GOES-19 static imagery entries

---

## Radar product catalog

| Product | Source | Type | Status |
|---------|--------|------|--------|
| N0R (Base Reflectivity) | IEM WMS | Reflectivity | ✅ Active |
| N0Q (Reflectivity HD) | IEM WMS | Reflectivity | ✅ Active |
| N0R-T (Reflectivity loop) | IEM WMS-T | Reflectivity loop | ✅ Active |
| N0Q-T (Reflectivity HD loop) | IEM WMS-T | Reflectivity loop | ✅ Active |
| N0S (Storm-relative Velocity) | RIDGE image | Velocity | ✅ Active |
| N0U (Velocity) | IEM WMS | Velocity | ❌ Broken/empty |
| N0B (Base Reflectivity) | RIDGE image | Reflectivity | ⏳ Optional |
| Northeast mosaic | NOAA RIDGE | Regional mosaic | ✅ Active (static) |
| GeoColor | GOES-19 | Satellite visible | ✅ Active |
| Channel 13 (Clean IR) | GOES-19 | Satellite infrared | ✅ Active |

---

## Nearest NEXRAD site

| Site | Code | Location | Coverage |
|------|------|----------|----------|
| Caribou, ME | CBW | Northern Maine | St. John Valley primary |

### API endpoints

- `GET /api/radar/status` — Nearest NEXRAD, product catalog, latest scan age
- `GET /api/radar/scans` — Available scan frames

---

## Related documents

- [Weather & Alert APIs](./WEATHER_ALERT_APIS.md) — NWS, SPC, IEM VTEC
- [Camera & Traffic APIs](./CAMERA_TRAFFIC_APIS.md) — GOES also appears in cam list
- [Internal API Endpoints](./INTERNAL_API_ENDPOINTS.md) — `/api/radar/*` routes