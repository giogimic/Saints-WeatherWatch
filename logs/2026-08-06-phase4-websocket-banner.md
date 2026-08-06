# 2026-08-06 — Phase 4: WebSocket live updates + new-warning banner

Status: **implemented** (was previously skipped on the roadmap)

## Backend
- `internal/ws` hub (`gorilla/websocket`)
- `GET /ws` mounted **outside** chi Timeout middleware
- NWS cache tracks prior alert IDs; on poll:
  - first seed → `snapshot` only (no banner spam)
  - later new IDs → `new_alerts` (full list + `newAlerts`)
  - otherwise → `snapshot`
- Origin check uses `ALLOWED_ORIGINS`

## Frontend
- `RealtimeService` connects to `/ws` with backoff reconnect
- `OpsStateService` applies push snapshots; HTTP poll remains as fallback when WS down
- `AlertBannerComponent` sticky under nav; auto-dismiss 20s; View → `/alerts`
- Nav LIVE badge reflects WS connected vs SYNC fallback

## Deploy note
Reverse proxy / frontend nginx must allow WebSocket upgrade on `/ws` (and/or `/api/ws`).
Docker frontend `nginx.conf` proxies both to the Go hub.

## 2026-08-06 follow-up
- Live site was failing `wss://…/ws` because frontend nginx only proxied `/api/`
- Fixed nginx WS proxy; client tries `/api/ws` then `/ws`; reconnect backoff capped to avoid console spam
- `contentscript.js` MaxListeners / ObjectMultiplex warnings are browser-extension noise (e.g. wallet), not app leaks
