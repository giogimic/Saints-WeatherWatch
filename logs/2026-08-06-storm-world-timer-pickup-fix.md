# 2026-08-06 — Remove timer + fix false “drop taken” pickups

## User ask
- Remove Storm World timer
- Investigate drops: says picked up / gone when alone

## Cause
Client sent `pickup` every animation frame while near a drop. First request succeeded (`Bagged …`); later requests hit a missing drop and toasted **“That drop is gone.”** — looked like another player stole it. Server position could also lag behind the client (move clamp + hello at fixed center).

## Fixes
- Removed run countdown; open-ended drive until **End** / **Exit**
- Silent ignore for already-gone drops (no false “stolen” toast)
- Client inflight debounce per drop; pickup/event messages include lat/lng
- `hello` snaps server position; soft sync before pickup distance check
- Successful bag returns `itemKey` so UI packs update reliably
- Slightly larger pickup radius / move allowance

## Files
- `backend/internal/world/room.go`
- `frontend/src/app/core/world.service.ts`
- `frontend/src/app/features/play/chase-game.component.ts`
