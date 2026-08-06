# 🌪️ Saints Weather Watch

**Live Site:** [https://wn.saintsgaming.net](https://wn.saintsgaming.net)

**Your personal storm-chasing command center** — live tornado tracking, real-time alerts, storm education, and chase logging built for weather enthusiasts.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 18+ (standalone components, signals, lazy routes) |
| Styling | Tailwind CSS 3 + DaisyUI 4 (custom "stormops" dark theme) |
| Map | Leaflet + ngx-leaflet (Phase 3) |
| Backend | Go 1.22+ with chi router |
| Database | SQLite via Prisma (prisma-client-go) — Postgres-ready |
| Realtime | WebSocket hub in Go (Phase 4) |

## Project Structure

```
Saints-WeatherWatch/
├── backend/                 # Go API server
│   ├── cmd/server/main.go   # Entry point
│   ├── internal/
│   │   ├── api/             # REST handlers
│   │   ├── config/          # Env-based config
│   │   └── store/           # Prisma data layer
│   ├── prisma/              # Schema + migrations
│   └── .env.example         # Environment template
├── frontend/                # Angular app
│   └── src/app/
│       └── features/        # home, map, alerts, live, learn, play
└── README.md
```

## Getting Started

### Prerequisites

- **Go** 1.22+ ([install](https://go.dev/dl/))
- **Node.js** 18+ and npm

### Backend

```bash
cd backend

# Copy env config
cp .env.example .env

# Install Go dependencies
go mod download

# Generate Prisma client + create database
go run github.com/steebchen/prisma-client-go db push

# Run the server (port 8080)
go run ./cmd/server
```

Verify: `curl http://localhost:8080/api/health`

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (port 4200, proxies /api → :8080)
npm start
```

Open `http://localhost:4200` in your browser.

## Features (Roadmap)

- [x] **Phase 1** — Project scaffold, Go server, Prisma DB, Angular app with storm theme
- [x] **Phase 2** — NWS alerts pipeline + home dashboard + alerts feed
- [x] **Phase 3** — Live map with radar/warnings WMS, LSR + SPC layers, cam pins, ops layer chips
- [x] **Phase 4** — WebSocket live updates (`/ws`) + new-warning banner
- [x] **Phase 5** — Learn hub (storm science, EF-scale, radar reading — plain-language)
- [x] **Phase 6** — Play quizzes + Prisma `QuizAttempt` leaderboard; chase logs in Archive
- [x] **Phase 7** — Live cams from `/api/cams` (opencctv/FAA/GOES) + responsive mobile ops nav
- [x] **Phase 8** — Docker compose deploy (see `update.sh` / deployment docs)
- [x] **Phase 9** — Chaser accounts (name+PIN), vehicle rewards, live Dashboard (favorites / watch zones)

### Recently shipped (see `logs/`)
- Storm Ops UI overhaul (quiet Archive, Live accordion, Map hub, deep links)
- Maine alert archive backfill from IEM VTEC
- Storm Expert Training quizzes + Top Experts board
- Saved locations / home-base pins on Map
- Chaser accounts, cartoon vehicle garage, SPA Dashboard with watched-area radius alerts
- WebSocket alert pushes + sticky new-warning banner (Phase 4)
- Radar Chase mini-game + profile loot collectables

## Data Sources (all free, no API keys)

- **NWS API** (`api.weather.gov`) — active warnings & watches
- **Iowa State IEM** — NEXRAD WMS, LSR GeoJSON, VTEC archive
- **SPC** — day-1 categorical outlook GeoJSON
- **NOAA Event-Driven WMS** — watch/warning polygons
- **GOES / FAA / regional cams** — via backend `/api/cams` proxy
- **OpenStreetMap / CARTO / Esri** — map basemaps

## Docs

- [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Build notes: [`logs/`](logs/)

## Database

SQLite via Prisma — zero setup. To switch to Postgres later:

1. Change `provider = "sqlite"` to `"postgresql"` in `prisma/schema.prisma`
2. Update `DATABASE_URL` to your Postgres connection string
3. Run `go run github.com/steebchen/prisma-client-go db push`

## License

Personal project — built for fun and learning. 🌪️