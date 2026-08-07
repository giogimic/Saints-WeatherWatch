# Power Outage APIs

> Back to: [Research Index](./README.md)

External data sources for power outage intelligence — public county/state estimates, utility maps, and commercial options.

---

## 1. ODIN — Oak Ridge National Laboratory (odin.ornl.gov)

**Primary public power outage estimate source.**

| Property | Value |
|----------|-------|
| Base URL | `https://odin.ornl.gov` |
| Auth | None |
| Format | JSON |
| Rate limit | None documented |

### Endpoints used

| URL | Purpose |
|-----|---------|
| `https://odin.ornl.gov/odi` | Public outage data |
| `https://odin.ornl.gov/odi/status` | ODIN service status |
| `https://odin.ornl.gov/odi/map` | Map data |

### Implementation notes

- **Always shows all 16 Maine counties** (zeros when no ODIN reporters — honest empty state).
- **Known limitation:** Maine CMP/Versant are **not** currently in the ODIN reporter list (live check: ME meters=0).
- UI states this clearly and points to utility maps.
- Overview fields: `maineMetersOut`, coverage flag, source note.
- Watched-area expand returns `outage` correlation (nearest ME county).
- Prisma `OutageSnapshot` for ME rollup history (paired with radar desk delta).

### Backend code

- `backend/internal/outages/client.go` — ODIN API client
- `backend/internal/outages/cache.go` — Outage cache + utility links

---

## 2. OpenDataSoft (ornl.opendatasoft.com)

**County-level outage data via OpenDataSoft API.**

| Property | Value |
|----------|-------|
| Base URL | `https://ornl.opendatasoft.com` |
| Auth | None |
| Format | JSON |
| Rate limit | None documented |

### Endpoint used

```
https://ornl.opendatasoft.com/api/explore/v2.1/catalog/datasets/odin-real-time-outages-county/records
```

### Implementation notes

- Provides county-level outage records from ODIN.
- Used alongside the direct ODIN API for county grid data.

### Backend code

- `backend/internal/outages/client.go` — `odinCountyURL` constant

---

## 3. Versant Power (versantpower.com)

**Utility outage map link (Northern & Eastern Maine).**

| Property | Value |
|----------|-------|
| URL | `https://www.versantpower.com/outages-restoration/live-outage-map/current-outage-alerts` |
| Auth | None (link only — no scraping) |
| Coverage | Northern & Eastern Maine |

### Implementation notes

- **Link only** — no scraping of address-level data.
- Shown in the UI when ODIN has no Maine reporters.
- Policy: county/municipality max — no address-level scraping.

---

## 4. CMP — Central Maine Power (cmpco.com)

**Utility outage map link (Central & Southern Maine).**

| Property | Value |
|----------|-------|
| URL | `https://www.cmpco.com/outages` |
| Auth | None (link only — no scraping) |
| Coverage | Central & Southern Maine |

### Implementation notes

- **Link only** — no scraping of address-level data.
- Shown in the UI when ODIN has no Maine reporters.
- Policy: county/municipality max — no address-level scraping.

---

## 5. PowerOutage.us / Outage Pro (commercial — optional)

**Commercial outage GeoJSON feed for higher-density Maine data.**

| Property | Value |
|----------|-------|
| Source | PowerOutage.us / Outage Pro |
| Auth | License required |
| Format | GeoJSON |
| Status | ⏳ Optional — not currently wired |

### Implementation notes

- Listed as an optional follow-up in the Ops Expansion Roadmap (Phase A).
- Would be wired only if ME stays dark on ODIN.
- Requires a commercial license.

---

## OutageSnapshot history

The backend stores ME rollup history in the Prisma `OutageSnapshot` table:

- Used for pairing radar desk with ME outage delta.
- `OutageSnapshot` records prior outage counts for trend/delta display.
- Radar desk shows ME meters + Δ vs prior snapshot.

---

## API endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/outages` | Current outage data (all 16 ME counties) |
| `GET /api/outages/geo` | Outage GeoJSON for map choropleth |
| `GET /api/outages/history` | OutageSnapshot history for trend/delta |

---

## Map layer

- **Outages** layer: county choropleth showing outage intensity.
- Overview badge: `maineMetersOut` + coverage flag.
- Home badge + desk expand outage line.

---

## Policy guardrails

1. Official/licensed APIs only.
2. County/municipality max for outages.
3. **No address-level scraping** — unless licensed.
4. Cite source + timestamp on every overlay.
5. Maine corridor first; national secondary.

---

## Related documents

- [Weather & Alert APIs](./WEATHER_ALERT_APIS.md) — NWS alerts for outage correlation
- [Radar & Satellite APIs](./RADAR_SATELLITE_APIS.md) — Radar desk pairs with outage delta
- [Internal API Endpoints](./INTERNAL_API_ENDPOINTS.md) — `/api/outages/*` routes
- [Ops Expansion Roadmap](../OPS_EXPANSION_ROADMAP.md) — Phase A (outages) plan