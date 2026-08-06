# 2026-08-06 — Deep dive: “memory leak” console issue

## What people saw in DevTools
1. Repeated `WebSocket connection to wss://…/ws failed`
2. `MaxListenersExceededWarning` / `ObjectMultiplex` from **`contentscript.js`**
3. Tab feeling heavier after leaving Storm World / Play

## Verdict (layered)

### A. Not our app — browser extension noise
`contentscript.js` + `ObjectMultiplex` + `MaxListenersExceededWarning` is injected by extensions (commonly MetaMask / wallet / similar). It is **not** Saints Weather Watch source. Reproduce in a clean profile / Incognito with extensions disabled: those warnings disappear.

### B. Was our app — alert WS reconnect spam (already fixed earlier)
Production nginx only proxied `/api/`, so `wss://host/ws` never reached Go → fail → reconnect loop → console flood that looked like a leak.
**Fix already in tree:** nginx `location = /ws`, client tries `/api/ws` then `/ws`, hard backoff in `RealtimeService`.

### C. Was our app — Storm World WS + Leaflet churn (fixed this pass)
1. **World reconnect after leave:** `WorldService` is a root singleton. Chase `ngOnDestroy` stopped markers but **did not** `disconnectWorld()`, so the socket kept reconnecting forever after leaving Play.
2. **Stacked reconnects:** `setTimeout(connectWorld, 4000)` was not cleared/backed off (unlike `RealtimeService`).
3. **Leaflet DOM churn:** peer/drop markers called `setIcon(...)` every 100ms with fresh SVG HTML even when nothing changed → detached DOM / rising memory in Performance panels.

## Fixes this pass
- `WorldService`: same reconnect discipline as alerts (single timer, backoff, teardown handlers, idle until connect, clear state on disconnect, pause when tab hidden)
- Chase `ngOnDestroy` → `disconnectWorld()`
- Peer/drop markers only update latlng/icon when values change
- `OpsStateService.stop()` clears the account refresh interval

## How to verify
1. Incognito, no extensions → no `contentscript` / MaxListeners noise
2. Network panel: `/api/ws` stays Open (or `/ws`); no rapid fail loop
3. Enter Storm World → leave Play → Network shows world WS **closed** and **no** further `/api/world/ws` attempts
4. Memory heap: after leave, world sockets/timers gone; marker count stable while driving with peers
