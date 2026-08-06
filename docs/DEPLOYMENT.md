# Saints Weather Watch Deployment Guide

## Overview

Saints Weather Watch is a weather alert and education dashboard with:
- an Angular 18 frontend,
- a Go backend API,
- a Prisma-backed SQLite layer for local development,
- and Linux-ready preview deployment support.

## Local development

### Prerequisites

- Go 1.22+
- Node.js 18+
- npm

### Start the backend

```bash
cd backend
export DATABASE_URL="file:./saints-weatherwatch.db"
go mod download
go run ./cmd/server
```

### Start the frontend

```bash
cd frontend
npm install
npm start
```

The app should be available at:
- frontend: http://localhost:4200
- API health: http://localhost:8080/api/health

## Production build

### Frontend

```bash
cd frontend
npm install
npm run build
```

### Backend

```bash
cd backend
export DATABASE_URL="file:./saints-weatherwatch.db"
go test ./...
go build ./cmd/server
```

## Docker deployment notes

The backend volume must only cover the database directory:

```yaml
volumes:
  - weatherwatch_db:/app/data
```

Never mount a named volume at `/app`. Docker seeds a named volume from the image only when
that volume is first created, so mounting `/app` permanently shadows the compiled `server`
binary and every later `docker compose up --build` keeps running the original build.

### WebSocket (`/ws`)

The frontend container nginx must proxy WebSocket upgrades to the backend. After Phase 4,
`frontend/nginx.conf` forwards `/ws` (and `/api/`) with `Upgrade` headers. Rebuild the
**frontend** image when changing that config:

```bash
docker compose build --no-cache frontend
docker compose up -d
```

If an outer reverse proxy sits in front of port 5080, it must also pass through WebSocket
upgrades (or only terminate TLS and forward to the frontend container).

### Rate limits (Phase F)

Public `GET` `/api/*` routes (except `/api/health` and WebSocket paths) are soft-limited
per client IP (~120 req/min). Responses include `X-RateLimit-Limit`,
`X-RateLimit-Remaining`, and `X-RateLimit-Reset`. On `429`, honor `Retry-After`.
CORS exposes these headers. Policy / attribution: `GET /api/policy`.


If the backend appears to be missing new routes (for example `/api/cams` returning 404 while
the frontend clearly updated), force a clean rebuild:

```bash
docker compose build --no-cache backend
docker compose up -d
docker compose logs --tail=80 backend
```

## Linux preview deployment

Use the repo root script:

```bash
chmod +x deploy-preview.sh
./deploy-preview.sh
```

The script will:
- detect whether a Caddyfile exists,
- detect whether Docker is installed,
- prompt for a preview subdomain,
- install frontend/backend dependencies,
- run the frontend build,
- run backend tests,
- and print the deployment handoff instructions.
