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

If the backend appears to be missing new routes (for example `/api/cams` returning 404 while
the frontend clearly updated), force a clean rebuild:

```bash
docker compose build --no-cache backend
docker compose up -d
docker compose logs --tail=80 backend
```

### Running server.exe under Wine

Only needed if you run the Windows binary outside Docker:

```bash
chmod +x start-backend-wine.sh
./start-backend-wine.sh start     # also: stop | restart | status | logs
```

Docker is preferred, since it builds a native Linux binary.

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
