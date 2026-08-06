# 2026-08-06 — Ops Phase A: ODIN outages impact desk

## Scope
First slice of the A→F expansion plan: power outage intelligence beside weather.

## What shipped
- Backend `internal/outages`: ODIN public `/odi` + OpenDataSoft county + `/odi/map` + status
- Always shows all 16 Maine counties (zeros when no ODIN reporters — honest empty state)
- Links to Versant + CMP utility maps
- APIs: `GET /api/outages`, `/api/outages/geo`, `/api/outages/history`
- Overview fields: `maineMetersOut`, coverage flag, source note
- Watched-area expand returns `outage` correlation (nearest ME county)
- Prisma `OutageSnapshot` for ME rollup history
- Map **Outages** layer (county choropleth)
- Home badge + desk expand outage line

## Known limitation
Maine CMP/Versant are **not** currently in the ODIN reporter list (live check: ME meters=0).
UI states this clearly and points to utility maps.

## Next (still Phase A polish / then B)
- Optional Outage Pro commercial feed when ME density needed
- Phase B: radar product toggle + latency
