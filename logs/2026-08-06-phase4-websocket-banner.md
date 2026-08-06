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
Reverse proxy must allow WebSocket upgrade on `/ws` (Caddy/`reverse_proxy` does by default).
