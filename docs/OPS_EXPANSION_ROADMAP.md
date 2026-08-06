# Ops expansion — weather / storm / disaster tracking

Phased plan (A→F) for expanding Saints Weather Watch ops capabilities.
Storm World / game stays a separate labeled SIM layer.

## Phase A — Impact desk (outages) — **done**

- [x] ODIN public county/state outage poll + ME county grid
- [x] Map Outages layer + overview badge + utility links
- [x] Watched-area ↔ outage correlation
- [x] OutageSnapshot history table
- [ ] Optional commercial outage GeoJSON (PowerOutage.us / Outage Pro) if ME stays dark on ODIN

## Phase B — Radar systems — **in progress**

- [x] Multi-product radar: reflectivity / reflectivity HD / storm-relative velocity (RIDGE)
- [x] Nearest NEXRAD (CBW) + scan-age / latency badge
- [x] Loop / timelapse (IEM WMS-T for composites; RIDGE archive for velocity)
- [x] Pair radar desk with ME outage delta from OutageSnapshot history
- [ ] Optional single-site reflectivity RIDGE as fourth product

## Phase C — Camera network

- Cam health (last frame age, black-frame)
- Group by corridor / watch zone; cams near active warning
- Optional DOT / traffic public feeds

## Phase D — Multi-hazard

- Flood gauges (USGS / AHPS)
- Fire/smoke, quake (USGS), winter roads, marine as feeds allow
- Shared Incident model (`kind` + source + lat/lon)

## Phase E — Product surfaces

- Map layer toggles unified
- Live “Impact mode”
- Desk watch-zone score (alert + outage + cam freshness)
- Archive storm packages

## Phase F — Reliability

- Cache / WS / stale banners
- Attribution + rate limits
- No address-level scraping; county/muni max unless licensed

## Guardrails

1. Real products stay trustworthy — no severity inflation.
2. Prefer official/licensed APIs over scrapers.
3. Cite source + timestamp on every overlay.
4. Maine corridor first; national secondary.
