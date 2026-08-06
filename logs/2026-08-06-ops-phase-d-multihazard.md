# 2026-08-06 — Ops Phase D: multi-hazard

## Context
Phase C (#14) merged. Continue A→F with Phase D on `giogimic/ops-phase-d-multihazard-3a25`.

## What shipped
- Shared live `Incident` model (`kind`, source, lat/lon, severity, meta)
- `internal/hazards`: NOAA NWPS/AHPS corridor gauges + USGS FDSN quakes
- APIs: `/api/hazards`, `/flood`, `/quakes`, `/geo`
- Overview: flood actionable / gauge count + quake count
- Map Flood + Quakes layers
- Watched-area expand returns nearby flood/quake incidents
- Fire/smoke deferred (no stable open feed wired)

## Gauges
DICM1, NINM1, ALLM1, FTKM1, FIHM1, MASM1, WSHM1, LMRM1, SJEB3

## Next
- Phase E impact mode / desk score, or fire/smoke when feed ready
