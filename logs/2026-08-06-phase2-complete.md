# 2026-08-06 — Phase 2 completion (soft anti-cheat)

## Closing Phase 2 checklist item
Soft anti-cheat polish on the existing world room (`backend/internal/world/room.go`):

- First hello may snap; later hellos use speed-clamped move (no teleport)
- Pickup / event_place cooldowns (400ms / 800ms)
- Action snap capped to pickup radius (0.06°) — lag only, not miles
- Successful bags/events award ItemDef XP via `progress.AwardFlat`
- Client `PICKUP_DIST` aligned to 0.06 in chase-game

## Docs
- `STORM_CHASER_ROADMAP.md` — Phase 1 + 2 done; Phase 3 next
- `STORM_CHASER_PHASE1.md` — harden notes updated for Phase 2 anti-cheat

## Verify
- `go build ./...` (backend) OK
- `ng build` (frontend) OK

## Ship
Branch: `giogimic/phase2-complete-3a25`  
PR: https://github.com/giogimic/Saints-WeatherWatch/pull/9 — **merged** to `main`

