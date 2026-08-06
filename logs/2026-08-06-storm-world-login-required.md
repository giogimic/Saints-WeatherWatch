# 2026-08-06 — Storm World login-only (no guests)

Guests used to enter a solo local chase map (no WS / no peers), which looked like
“multiplayer broken.” Storm World now requires a chaser account:

- Play hub `openChase()` opens signup/login modal for guests
- Chase component bails + opens modal if somehow mounted logged-out
- `startRun` always uses shared world mode (no local guest spawn path)

Presence/chat/lobby work from earlier in this branch is unchanged.
