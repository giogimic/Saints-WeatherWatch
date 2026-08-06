# 2026-08-06 — Storm World presence (standard snapshot tick)

## Ask
Review multiplayer so players can see each other; use popular patterns, don’t invent a custom protocol.

## What was wrong
- Presence broadcast on **every** move → WebSocket flood; slow clients got **kicked** (chat-hub pattern) so peers vanished.
- Peer markers were tiny name chips, refreshed only every 500ms.
- Reconnect could leave duplicate sockets for the same user.

## Approach (boring / standard)
Authoritative server + fixed **~10 Hz presence snapshot** (Gaffer / Gambetta casual sync):
- Clients send rate-limited `move`
- Server clamps and marks dirty
- Tick broadcasts full player list when 2+ online
- Immediate presence on join / leave / hello
- One connection per userID
- Drop a frame for slow clients instead of disconnecting

## Client
- HUD: `N online`
- Other chasers: vehicle SVG + nameplate
- Marker sync at 100ms to match tick

## Files
- `backend/internal/world/room.go`
- `frontend/.../chase-game.component.ts`, `styles.scss`
- `docs/STORM_CHASER_PHASE1.md`
