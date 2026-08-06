# 2026-08-06 — Phase 2 completion (soft anti-cheat)

## Closing Phase 2 checklist item
Soft anti-cheat polish on the existing world room:

- First hello may snap; later hellos use speed-clamped move (no teleport)
- Pickup / event_place cooldowns (400ms / 800ms)
- Action snap capped to pickup radius (0.06°) — lag only, not miles
- Successful bags/events award ItemDef XP via progress.AwardFlat
- Client pickup distance aligned to 0.06

## Docs
STORM_CHASER_ROADMAP.md marks Phase 1 + 2 done; Phase 3 is next.

