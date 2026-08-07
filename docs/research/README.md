# Saints Weather Watch — API & Tools Research Index

> **Purpose:** Centralized research catalog of every external API, data source, tool, and internal endpoint used by (or available to) Saints Weather Watch.
> Compiled from `docs/`, `logs/`, backend Go source, frontend Angular source, and project configs.
> **No coding changes** — research only.

Related: [Project Overview](../PROJECT_OVERVIEW.md) · [Ops Expansion Roadmap](../OPS_EXPANSION_ROADMAP.md) · [Storm Chaser Vision](../STORM_CHASER_VISION.md) · [Build Logs](../../logs/README.md)

---

## Document categories

| Category | Document | Description |
|----------|----------|-------------|
| Master Vision | [MASTER_VISION_ACCESSIBILITY.md](./MASTER_VISION_ACCESSIBILITY.md) | Universal dual-lens architecture (Expert power + visual simplicity) |
| Master Storm World Immersion | [MASTER_STORM_WORLD_IMMERSION.md](./MASTER_STORM_WORLD_IMMERSION.md) | Site-wide live weather gamification, visual quests, biomes, deployables |
| Educational & UI Accessibility | [EDUCATIONAL_ACCESSIBILITY_GUIDE.md](./EDUCATIONAL_ACCESSIBILITY_GUIDE.md) | Multi-sensory UI patterns, visual badges, plain-language weather dictionary |
| Weather & Alerts | [WEATHER_ALERT_APIS.md](./WEATHER_ALERT_APIS.md) | NWS, Environment Canada, SPC, IEM VTEC archive |
| Radar & Satellite | [RADAR_SATELLITE_APIS.md](./RADAR_SATELLITE_APIS.md) | IEM NEXRAD WMS, RIDGE products, GOES-19 imagery |
| Algorithmic Storm Attributes | [ALGORITHMIC_STORM_ATTRIBUTES.md](./ALGORITHMIC_STORM_ATTRIBUTES.md) | TVS, MDA, VIL, POSH, XWeather, IEM GeoJSON vector overlays |
| Cameras & Traffic | [CAMERA_TRAFFIC_APIS.md](./CAMERA_TRAFFIC_APIS.md) | OpenCCTV, FAA Weathercams, NE511, NB511, USGS |
| Telematics & Aviation | [TELEMATICS_AVIATION_OBSERVATIONS.md](./TELEMATICS_AVIATION_OBSERVATIONS.md) | MaineDOT Waze ATMS, Quebec MTMD 511, NB DTI jpg bursts, METAR regex |
| Power Outages | [OUTAGE_APIS.md](./OUTAGE_APIS.md) | ODIN/ORNL, OpenDataSoft, Versant, CMP, commercial options |
| Multi-Hazard | [MULTIHAZARD_APIS.md](./MULTIHAZARD_APIS.md) | NOAA NWPS/AHPS flood gauges, USGS FDSN earthquakes |
| Map & Visualization | [MAP_VISUALIZATION_TOOLS.md](./MAP_VISUALIZATION_TOOLS.md) | Leaflet, OpenStreetMap, CARTO, Esri, Tailwind/DaisyUI |
| Backend & Infra | [BACKEND_INFRASTRUCTURE_TOOLS.md](./BACKEND_INFRASTRUCTURE_TOOLS.md) | Go, chi, Prisma, SQLite, gorilla/websocket, Docker, nginx, Caddy |
| Internal API Endpoints | [INTERNAL_API_ENDPOINTS.md](./INTERNAL_API_ENDPOINTS.md) | All REST + WebSocket routes exposed by the Go backend |
| Game Layer Systems | [GAME_LAYER_SYSTEMS.md](./GAME_LAYER_SYSTEMS.md) | Storm World: presence, drops, craft, trade, research, WS room |

---

## Source research documents (`.docs/`)

The following source research documents in the `.docs/` directory were used to compile this catalog:

| Document | Description |
|----------|-------------|
| [`.docs/StormAttributeMarkers.md`](../../.docs/StormAttributeMarkers.md) | Interactive storm attribute markers & vector overlays architecture |
| [`.docs/AdvancedBroadWeatherAPIResearchforBorderRegio.html`](../../.docs/AdvancedBroadWeatherAPIResearchforBorderRegio.html) | Transnational meteorological & telematics data architectures for the Maine-Canada border region |

---

## Quick reference — all external data sources

| Source | Type | URL | Auth | Status |
|--------|------|-----|------|--------|
| NWS API | Weather alerts | `https://api.weather.gov/alerts/active` | User-Agent only | ✅ Active |
| IEM NEXRAD WMS | Radar | `https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/` | None | ✅ Active |
| IEM VTEC Archive | Alert history | `https://mesonet.agron.iastate.edu/json/vtec_events.py` | None | ✅ Active |
| IEM Storm Attributes | Vector markers | `https://mesonet.agron.iastate.edu/geojson/` | None | ⏳ Evaluated |
| XWeather API | Stormcells API | `https://data.api.xweather.com/stormcells/` | API Key | ⏳ Evaluated |
| ECCC DD-Alpha TSO | Canadian outlooks | `https://hpfx.collab.science.gc.ca/~rum001/eccc/tso/` | None | ⏳ Evaluated |
| MaineDOT ATMS / Waze | Telematics | `ArcGIS REST FeatureServers` | None | ⏳ Evaluated |
| Quebec MTMD | 511 Cams | `Données Québec GeoJSON` | None | ⏳ Evaluated |
| NB DTI | 511 Cams | `Static .jpg image bursts` | None | ⏳ Evaluated |
| IEM Radar JSON | Radar metadata | `https://mesonet.agron.iastate.edu/json/radar` | None | ✅ Active |
| IEM RIDGE images | Radar tiles | `https://mesonet.agron.iastate.edu/data/gis/images/4326/ridge/` | None | ✅ Active |
| NOAA RIDGE | Radar imagery | `https://radar.weather.gov/ridge/standard/` | None | ✅ Active |
| NOAA GOES-19 | Satellite | `https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ne/` | None | ✅ Active |
| NOAA NWPS/AHPS | Flood gauges | `https://api.water.noaa.gov/nwps/v1/gauges/` | None | ✅ Active |
| USGS FDSN | Earthquakes | `https://earthquake.usgs.gov/fdsnws/event/1/query` | None | ✅ Active |
| Environment Canada | Canada alerts | `https://weather.gc.ca/rss/warning/` | None | ✅ Active |
| ODIN (ORNL) | Power outages | `https://odin.ornl.gov/odi` | None | ✅ Active (ME sparse) |
| OpenDataSoft | County outages | `https://ornl.opendatasoft.com/api/explore/v2.1/...` | None | ✅ Active |
| OpenCCTV | Camera discovery | `https://opencctv.org/api/cameras?bounds=` | None | ✅ Active |
| FAA Weathercams | Aviation cams | `https://weathercams.faa.gov/api/` | None | ✅ Active |
| SPC | Convective outlooks | (GeoJSON, day-1 categorical) | None | ✅ Active |
| Versant Power | Utility outages | `https://www.versantpower.com/outages-restoration/...` | None (link only) | ✅ Link |
| CMP | Utility outages | `https://www.cmpco.com/outages` | None (link only) | ✅ Link |
| PowerOutage.us | Commercial outages | (commercial GeoJSON) | License | ⏳ Optional |
| OpenStreetMap | Map basemap | `https://{s}.tile.openstreetmap.org/` | None | ✅ Active |
| CARTO | Dark basemap | `https://{s}.basemaps.cartocdn.com/` | None | ✅ Active |
| Esri | Imagery basemap | `https://server.arcgisonline.com/ArcGIS/...` | None | ✅ Active |

---

## Configuration reference (`.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8080` | Backend listen port |
| `DATABASE_URL` | `file:./data/weatherwatch.db` | Prisma SQLite path (swap for Postgres URL in prod) |
| `ALLOWED_ORIGINS` | `http://localhost:4200,...` | CORS + WebSocket origin check |
| `NWS_ALERT_INTERVAL_SEC` | `180` | NWS active-alerts poll interval |
| `IEM_REPORT_INTERVAL_SEC` | `120` | IEM LSR/report poll interval |
| `SPC_OUTLOOK_INTERVAL_SEC` | `600` | SPC outlook poll interval |
| `CAM_DISCOVER_INTERVAL_SEC` | `3600` | OpenCCTV tiled discovery interval |
| `USER_AGENT` | `SaintsWeatherWatch/1.0 (...)` | Required by NWS API for identification |

---

## Trust boundary (non-negotiable)

| Real ops (sacred) | Game layer |
|-------------------|------------|
| NWS alerts, radar, cams, archive, forecasts | Drops, SIM events, craft, trade, deployables, cosmetics |
| Never altered for gameplay drama | Always labeled when simulated |
| Official products stay readable | Bright / stylized game chrome only |

**SIMULATED EVENT · Gameplay Only · Not Real Weather** — every optional fantasy beat must stay visually and verbally distinct from official products.

---

## Policy

- Official/licensed APIs only. No API keys required for current sources.
- County/municipality max for outages. No address-level scraping.
- Cite source + timestamp on every overlay.
- Maine corridor first; national secondary.
- Not an emergency service — always follow official NWS guidance during severe weather.

See [LEGAL.md](../LEGAL.md) for full attribution and disclaimer details.