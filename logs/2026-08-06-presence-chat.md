# 2026-08-06 — Presence fix + lobby chat

## Problems
- Players on different lobby shards never see each other (same basemap, separate rooms).
- First `hello` snapped joiners to random solo spawns, scattering peers across Maine.
- Follow-cam + long drives left peers off-screen even when presence worked.

## Fixes
- Joiners spawn near existing peer centroid; first hello no longer teleports when peers present.
- Client adopts server `you` from snapshot; tighter world-mode start jitter.
- Auto `fitBounds` once when peers appear; **Find** button to reframe.
- Lobby picker copy: stay on **Main Corridor** to play together.
- Lobby switch forces WS reopen (`?lobby=`).
- Presence `players` always encoded (no omitempty wipe).

## Chat
- Per-lobby chat via WS `chat` messages (rate-limited, 140 chars).
- Mobile-friendly bottom-right panel (16px input, large Send, safe-area).
