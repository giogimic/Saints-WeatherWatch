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
