# 2026-08-06 — Ops Phase F: reliability

## Context
Phase E (#16) merged. Continue A→F with Phase F on `giogimic/ops-phase-f-reliability-3a25`.

## What shipped
- Feed freshness on NWS alerts, ODIN outages, multi-hazard caches
- Overview `freshness` + `attribution` + `policyNote`; `GET /api/policy`
- Soft per-IP GET rate limit middleware (`X-RateLimit-*`, JSON 429)
- Stale banner in alert-banner; attribution on Home / Map / Live
- Docs: roadmap F done, DEPLOYMENT rate-limit note

## Policy
Official/licensed APIs only. County/municipality max for outages. No address-level scraping.

## Next
Ops A→F complete for this corridor plan. Optional later: commercial outage GeoJSON, fire/smoke feed when stable, winter/marine.
