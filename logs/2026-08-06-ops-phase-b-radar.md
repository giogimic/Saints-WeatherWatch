# 2026-08-06 — Ops Phase B: radar systems

## Context
Phase A (#12) merged. Continue A→F with Phase B on `giogimic/ops-phase-b-radar-3a25`.

## What shipped
- Backend `internal/radar`: IEM available / list / RIDGE worldfile bounds + archive URLs
- APIs: `GET /api/radar/status`, `GET /api/radar/scans`
- Status includes nearest NEXRAD (CBW for St. John Valley), product catalog, latest scan age
- Outage pairing: ME meters + Δ vs prior `OutageSnapshot`
- Map radar desk HUD: product Ref / HD / Vel, scan-age badge, loop + scrub
- Reflectivity uses IEM WMS (+ WMS-T loop); velocity uses RIDGE N0S image overlay + archive frames
- Removed separate Radar+ chip; HD is a product choice (persisted Radar+ migrates to n0q)

## Notes
- IEM `n0u` velocity WMS is currently empty/broken — N0S RIDGE is the working velocity product
- ME ODIN meters often 0; pairing still shows honest delta / note

## Next
- Phase C camera health, or optional CBW N0B RIDGE product
