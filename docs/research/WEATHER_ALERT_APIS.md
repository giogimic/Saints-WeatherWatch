# Weather & Alert APIs

> Back to: [Research Index](./README.md)

External data sources for active weather warnings, watches, advisories, convective outlooks, and historical alert archives.

---

## 1. NWS API (api.weather.gov)

**The primary real-time alert source for the United States.**

| Property | Value |
|----------|-------|
| Base URL | `https://api.weather.gov` |
| Auth | None (requires `User-Agent` header identifying your app) |
| Format | JSON (GeoJSON for geometry) |
| Rate limit | No official limit; be respectful (we poll every 180s) |
| Docs | https://www.weather.gov/documentation/services-web-api |

### Endpoints used

| Endpoint | Purpose |
|----------|---------|
| `/alerts/active?area=ME` | Maine-first active alerts (highest priority) |
| `/alerts/active` | All USA active alerts (capped to Extreme/Severe for archive) |

### Implementation notes

- **Maine-first:** `?area=ME` is pulled first so Maine is never starved by national top-N.
- **National scope:** Extreme/Severe + tornado/hurricane/blizzard archived as `usa`.
- **User-Agent required:** NWS rejects requests without identification. Configured via `USER_AGENT` env var.
- **Geometry preserved:** Alert geometry/centroids are preserved for radius matching with watched areas.
- **Active records repaired on upsert:** `datePulled` represents actual issue time.
- **WebSocket push:** NWS cache tracks prior alert IDs; on poll, new IDs trigger `new_alerts` WS message to connected clients.

### Backend code

- `backend/internal/nws/client.go` — NWS API client, active alert polling
- `backend/internal/nws/canada.go` — Environment Canada RSS feeds (NB/QC)
- `backend/internal/ws/` — WebSocket hub for real-time alert push

### Config

```
NWS_ALERT_INTERVAL_SEC=180
USER_AGENT=SaintsWeatherWatch/1.0 (saintsweatherwatch.app)
```

---

## 2. Environment Canada (weather.gc.ca)

**Canadian alert source for New Brunswick and Quebec (border regions).**

| Property | Value |
|----------|-------|
| Base URL | `https://weather.gc.ca` |
| Auth | None |
| Format | RSS/Atom XML |
| Rate limit | None documented |

### Feeds used

| Feed | Region |
|------|--------|
| `https://weather.gc.ca/rss/warning/nb_e.xml` | New Brunswick (English) |
| `https://weather.gc.ca/rss/warning/qc_e.xml` | Quebec (English) |

### Implementation notes

- Parsed and stored as `canada` scope in the archive.
- Live `/api/alerts` includes Canada alongside Maine/national.
- Archive UI: Region Scope filter (Maine / USA & Canada / Global).

### Backend code

- `backend/internal/nws/canada.go` — RSS feed parsing

---

## 3. SPC — Storm Prediction Center

**Convective outlooks for severe weather risk areas.**

| Property | Value |
|----------|-------|
| Base URL | `https://www.spc.noaa.gov` |
| Auth | None |
| Format | GeoJSON (day-1 categorical) |
| Rate limit | None documented |

### Products used

| Product | Description |
|---------|-------------|
| Day-1 Convective Outlook | Categorical risk areas (slight/enhanced/moderate/high) |
| LSR GeoJSON | Local Storm Reports (via IEM) |

### Implementation notes

- Day-1 categorical outlook rendered as a map layer (`SPC day-1` chip).
- Polled every 600s (10 min).

### Config

```
SPC_OUTLOOK_INTERVAL_SEC=600
```

---

## 4. IEM VTEC Archive (mesonet.agron.iastate.edu)

**Historical alert archive for backfilling the database with past warnings.**

| Property | Value |
|----------|-------|
| Base URL | `https://mesonet.agron.iastate.edu` |
| Auth | None |
| Format | JSON |
| Rate limit | None documented |

### Endpoint used

```
https://mesonet.agron.iastate.edu/json/vtec_events.py?wfo={WFO}&year={year}&fmt=json
```

### Implementation notes

- **Backfill target WFOs:** CAR (Caribou) and GYX (Gray) — Maine forecast offices.
- Filters to most recent 18 months and locations explicitly containing `[ME]`.
- Stable IDs: `iem-{WFO}-{year}-{code}-{eventID}` (idempotent reruns).
- Event codes: `SV.W` (Severe Thunderstorm Warning), `TO.W` (Tornado Warning), etc.
- Enriches archive with: source, source URL, VTEC event code, issuing office, status.
- Startup + daily backfill.

### Also: IEMBot (weather.im)

- `weather.im` is IEM's near-real-time IEMBot monitor.
- JSON service: `https://weather.im/iembot-json/room/{room}?seqnum=#`
- **Note:** This is a recent-message feed, not a durable historical source. The VTEC archive endpoint above is used instead for historical data.

### Backend code

- `backend/internal/nws/iem.go` — VTEC archive backfill client

---

## 5. NOAA Event-Driven WMS

**Watch/warning polygons as WMS overlay on the map.**

| Property | Value |
|----------|-------|
| Format | WMS (Web Map Service) |
| Auth | None |

### Implementation notes

- Rendered as `Warnings WMS` layer chip on the map.
- Polygons sourced from NWS active alerts.

---

## Alert archive scopes

| Scope | Source | Description |
|-------|--------|-------------|
| `maine` | NWS `?area=ME` | Maine active alerts (highest priority) |
| `usa` | NWS `/alerts/active` | National Extreme/Severe + tornado/hurricane/blizzard |
| `canada` | Environment Canada RSS | NB + QC warning feeds |
| `global` | (placeholder) | Not yet wired — no non-US/CA source |

### API endpoints

- `GET /api/alerts` — Live alerts (Maine-first, then capped national/canada)
- `GET /api/history?scope=maine|national|global|usa|canada` — Archive query
- `GET /api/storm-packages/export` — Storm package JSON export from archive

---

## Related documents

- [Radar & Satellite APIs](./RADAR_SATELLITE_APIS.md) — IEM NEXRAD, RIDGE, GOES
- [Internal API Endpoints](./INTERNAL_API_ENDPOINTS.md) — All backend routes
- [Ops Expansion Roadmap](../OPS_EXPANSION_ROADMAP.md) — Phase A→F plan