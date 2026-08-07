# Backend & Infrastructure Tools

> Back to: [Research Index](./README.md)

Backend language, frameworks, database, realtime, deployment, and DevOps tools used by Saints Weather Watch.

---

## 1. Go (Golang)

**Backend language and API server.**

| Property | Value |
|----------|-------|
| Version | Go 1.22+ |
| Entry point | `backend/cmd/server/main.go` |
| Listen port | `8080` (configurable via `PORT`) |
| Module file | `backend/go.mod` |

### Implementation notes

- HTTP server with chi router.
- Polling loops for NWS, IEM, SPC, OpenCCTV, ODIN, hazards.
- Server-authoritative game logic (inventory, craft, trade, world room).
- Soft per-IP GET rate limit middleware (`X-RateLimit-*`, JSON 429 + `Retry-After`).
- CORS exposes rate-limit headers.

### Backend code

- `backend/cmd/server/main.go` — Entry point, `godotenv` loading
- `backend/internal/api/` — REST handlers + rate limit middleware
- `backend/internal/config/` — Env-based config
- `backend/internal/store/` — Prisma data layer

---

## 2. chi Router

**Lightweight HTTP router for Go.**

| Property | Value |
|----------|-------|
| Library | `github.com/go-chi/chi/v5` |
| Middleware | Timeout, CORS, Rate limit, Logger |

### Implementation notes

- REST routes mounted under `/api/`.
- WebSocket (`GET /ws`) mounted **outside** chi Timeout middleware to allow long-lived connections.
- Rate limit middleware on public `GET` `/api/*` routes (except `/api/health` and WebSocket paths).

### Backend code

- `backend/internal/api/api.go` — Route registration + middleware

---

## 3. Prisma (prisma-client-go)

**Type-safe database ORM with Go client.**

| Property | Value |
|----------|-------|
| Client | `github.com/steebchen/prisma-client-go` |
| Schema | `backend/prisma/schema.prisma` |
| Database | SQLite (dev) → Postgres-ready |
| Dev DB | `backend/data/weatherwatch.db` |

### Implementation notes

- **SQLite for local dev:** `DATABASE_URL=file:./data/weatherwatch.db`
- **Postgres-ready:** Change `provider = "sqlite"` to `"postgresql"` in schema + update `DATABASE_URL`.
- **DB push:** `go run github.com/steebchen/prisma-client-go db push` (no migration files needed).
- **Path normalization:** `store.New` absolutizes `file:` URLs so Go cwd and Prisma schema-dir resolution share one file.
- **Generated client:** `backend/internal/store/gen/` (gitignored).

### Key Prisma models

| Model | Purpose |
|-------|---------|
| `User` | Chaser accounts (name, PIN hash, email, XP, level) |
| `UserCollectible` | Inventory stacks (itemKey + count) |
| `TrackerIncident` | Alert archive (scope: maine/usa/canada/global) |
| `OutageSnapshot` | ME outage rollup history |
| `CameraMeta` | Camera health metadata |
| `TradeListing` | Storm Market trade listings |
| `ResearchLogEntry` | Weather-linked research log |
| `DashboardPreference` | User dashboard layout prefs |
| `FavoriteCamera` | User favorite cameras |
| `WatchedArea` | User watched areas (25/50/100/150 mi) |
| `SavedLocation` | User home-base pins |
| `QuizAttempt` | Play quiz attempts + leaderboard |

### Backend code

- `backend/prisma/schema.prisma` — Full schema
- `backend/internal/store/store.go` — Prisma client wrapper

---

## 4. SQLite

**Embedded database for local development.**

| Property | Value |
|----------|-------|
| Type | Embedded file-based |
| Dev path | `backend/data/weatherwatch.db` |
| Docker path | `/app/data/weatherwatch.db` |
| Swap target | PostgreSQL (production) |

### Implementation notes

- Zero setup — no external database server needed.
- Docker volume must only cover the database directory (`/app/data`), never `/app`.
- `entrypoint.sh` normalizes `DATABASE_URL` to an absolute `file:` path.

---

## 5. gorilla/websocket

**WebSocket library for Go — real-time alert push and Storm World.**

| Property | Value |
|----------|-------|
| Library | `github.com/gorilla/websocket` |
| Endpoints | `GET /ws`, `GET /api/world/ws` |
| Origin check | `ALLOWED_ORIGINS` env var |

### Implementation notes

- **Ops WebSocket (`/ws`):** NWS cache tracks prior alert IDs; on poll, new IDs → `new_alerts` message; otherwise → `snapshot`.
- **Storm World WebSocket (`/api/world/ws`):** Presence + drops + events + research HUD; cookie session auth.
- One WebSocket per user (reconnect replaces old socket).
- Slow clients drop a frame instead of being kicked (game tick pattern, not chat-hub kick).
- Origin check uses `ALLOWED_ORIGINS`.

### Backend code

- `backend/internal/ws/` — WebSocket hub

---

## 6. bcrypt

**Password hashing for chaser accounts.**

| Property | Value |
|----------|-------|
| Library | `golang.org/x/crypto/bcrypt` |
| Auth model | Chaser name + 4-digit PIN |

### Implementation notes

- PIN hashed with bcrypt.
- HttpOnly cookie sessions (`ww_session`).
- PIN attempt rate limit / lockout.

### Backend code

- `backend/internal/auth/auth.go` — bcrypt + session management

---

## 7. godotenv

**Environment variable loader for Go.**

| Property | Value |
|----------|-------|
| Library | `github.com/joho/godotenv` |
| Config file | `backend/.env` (from `.env.example`) |

### Implementation notes

- Loaded in `cmd/server/main.go` before server start.
- `.env.example` committed as template.

---

## 8. Docker + docker-compose

**Containerized deployment.**

| Property | Value |
|----------|-------|
| Compose file | `docker-compose.yml` |
| Backend Dockerfile | `backend/Dockerfile` |
| Frontend Dockerfile | `frontend/Dockerfile` |
| Backend volume | `weatherwatch_db:/app/data` |

### Implementation notes

- **Backend volume:** Must only cover `/app/data` — never `/app` (shadows compiled binary).
- **Frontend nginx:** Proxies `/api/` and `/ws` to backend with WebSocket upgrade headers.
- **Rebuild:** `docker compose build --no-cache backend` or `frontend` after config changes.
- **Health check:** `update.sh` verifies `/api/health` + `/api/cams` post-deploy.

### Key files

- `docker-compose.yml` — Service definitions
- `backend/Dockerfile` — Backend image
- `backend/entrypoint.sh` — DB push + server start
- `frontend/Dockerfile` — Frontend nginx image
- `frontend/nginx.conf` — Reverse proxy config

---

## 9. nginx

**Frontend container reverse proxy.**

| Property | Value |
|----------|-------|
| Config | `frontend/nginx.conf` |
| Proxies | `/api/` → backend, `/ws` → backend (WebSocket upgrade) |

### Implementation notes

- Must proxy WebSocket upgrades on `/ws` (and/or `/api/ws`).
- After Phase 4, forwards `/ws` (and `/api/`) with `Upgrade` headers.
- If an outer reverse proxy sits in front of port 5080, it must also pass through WebSocket upgrades.

### WebSocket proxy note

- Live site was failing `wss://…/ws` because frontend nginx only proxied `/api/`.
- Fixed: nginx WS proxy; client tries `/api/ws` then `/ws`; reconnect backoff capped.

---

## 10. Caddy (optional)

**Optional outer reverse proxy for Linux preview deployment.**

| Property | Value |
|----------|-------|
| Detection | `deploy-preview.sh` checks for Caddyfile |
| Status | Optional — used for preview deployments |

### Implementation notes

- `deploy-preview.sh` detects whether a Caddyfile exists.
- If Caddy is present, it can serve as the outer reverse proxy.
- Must pass through WebSocket upgrades (or only terminate TLS and forward to frontend container).

---

## 11. Deploy / Dev Scripts

| Script | Purpose |
|--------|---------|
| `deploy-preview.sh` | Linux preview bootstrap (Caddy/Docker detection, deps, build, tests) |
| `update.sh` | Production deploy + health check (`/api/health` + `/api/cams`) |
| `run-dev.bat` | Windows dev startup (backend + frontend) |
| `install-deps.bat` | Windows dependency installer |

---

## Rate limiting (Phase F)

| Property | Value |
|----------|-------|
| Scope | Public `GET` `/api/*` routes |
| Excluded | `/api/health`, WebSocket paths |
| Limit | ~120 req/min per client IP |
| Headers | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |
| 429 response | JSON + `Retry-After` header |
| CORS | Rate-limit headers exposed |

---

## Freshness & attribution (Phase F)

- Feed freshness tracked on: NWS alerts, ODIN outages, multi-hazard caches.
- Overview `freshness` + `attribution` + `policyNote` blocks.
- `GET /api/policy` — Policy note: official APIs only; county/muni max; no address-level scraping.
- Stale banner in alert-banner; attribution on Home / Map / Live.

---

## Related documents

- [Internal API Endpoints](./INTERNAL_API_ENDPOINTS.md) — All REST + WS routes
- [Game Layer Systems](./GAME_LAYER_SYSTEMS.md) — Storm World backend
- [Deployment Guide](../DEPLOYMENT.md) — Full deployment instructions