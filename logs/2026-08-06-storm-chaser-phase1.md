# Storm Chaser Phase 1 — Shared World + Trade/Craft

**Date:** 2026-08-06  
**Branch:** `giogimic/cloud-agent-1785973911340-q5t29`

## Goal
Expand Radar Chase into a simple synchronized Storm World: shared players, drops, and simulated events; Trade Center + craft; server-authoritative inventory (no client loot grants for the shared path).

## Docs
- `docs/STORM_CHASER_VISION.md` — living-world vision + trust boundary (real weather vs game layer)
- `docs/STORM_CHASER_PHASE1.md` — security model, APIs, WS message types

## Backend
- Prisma: `TradeListing` (+ `User.tradeListings`); inventory remains `UserCollectible`
- `backend/internal/world` — room hub: presence, server-spawned drops, SIM events, speed-clamped move, distance-checked pickup / event_place, craft helpers
- Bounds: Maine corridor lat `44.6–47.5`, lng `-71.2–66.9`
- REST under `/api/world/*` (catalog, inventory, craft, trades)
- WS: `GET /api/world/ws` (login required)

## Frontend
- `WorldService` — REST + world WS client
- `TradeCenterComponent` at `/trade`
- Chase → **Storm World**: logged-in players join shared room; guests keep solo local drops
- World pickups do **not** POST `/api/chase/runs` (avoids double-award / client trust)
- Play hub links: Storm World + Trade Center; More menu includes Trade

## Security (Phase 1)
- Server spawns drops/events; clients send `hello` / `move` / `pickup` / `event_place` only
- Inventory mutations only in Go (`GrantStack` / `ConsumeStack`)
- Simulated events labeled SIM / not real weather
- Soft anti-teleport: max degrees/sec clamp; pickups require proximity

## Deploy notes
- Rebuild backend (prisma gen for `TradeListing`) + frontend (nginx `/api/` already upgrades WS → `/api/world/ws` works)
- `prisma db push` on container start via entrypoint
