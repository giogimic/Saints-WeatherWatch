# 🌪️ Saints Weather Watch

**Live Site:** [https://wn.saintsgaming.net](https://wn.saintsgaming.net)  
**Publisher:** [Saints Gaming](https://saintsgaming.net)

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

### Recently shipped (see [`logs/`](logs/))
- Storm Ops UI overhaul (quiet Archive, Live accordion, Map hub, deep links)
- Maine alert archive backfill from IEM VTEC
- Storm Expert Training quizzes + Top Experts board
- Saved locations / home-base pins on Map
- Chaser accounts, cartoon vehicle garage, SPA **Profile** (favorites / watch zones)
- WebSocket alert pushes + sticky new-warning / stale banners
- Radar Chase → **Storm World** (presence, drops, SIM events, craft, lobbies, research)
- Storm Credits + Bag / Storm Market (vendor + player barter) + craft/trade rate limits
- Discrete Storm Map search + bottom-right radar desk

## Storm Chaser living world (game layer)

Long-term vision (grain of salt — do not rewrite the ops app to chase it):

- [docs/STORM_CHASER_VISION.md](docs/STORM_CHASER_VISION.md) — full living-world north star + trust boundary  
- [docs/STORM_CHASER_PHASE1.md](docs/STORM_CHASER_PHASE1.md) — shared-world build contract  
- [docs/STORM_CHASER_ROADMAP.md](docs/STORM_CHASER_ROADMAP.md) — Phase 1–4 core done · deployables next

## Data Sources (all free, no API keys)

- **NWS API** (`api.weather.gov`) — active warnings & watches
- **Iowa State IEM** — NEXRAD WMS / WMS-T loop, RIDGE velocity, LSR GeoJSON, VTEC archive; desk meta via `/api/radar/*`
- **SPC** — day-1 categorical outlook GeoJSON
- **NOAA Event-Driven WMS** — watch/warning polygons
- **ODIN (ORNL)** — public power outage estimates (`/api/outages`); ME county grid + Versant/CMP links when ODIN has no Maine reporters
- **NOAA NWPS / AHPS** — corridor flood gauges (`/api/hazards`); USGS Earthquake Hazards for regional quakes
- **GOES / FAA / regional cams** — via backend `/api/cams` proxy (health, corridors, near-warnings)
- **OpenStreetMap / CARTO / Esri** — map basemaps

## Docs

- [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/LEGAL.md](docs/LEGAL.md) — copyright, disclaimers, data attribution
- [docs/OPS_EXPANSION_ROADMAP.md](docs/OPS_EXPANSION_ROADMAP.md) — ops expansion A→F **done**
- [docs/STORM_CHASER_VISION.md](docs/STORM_CHASER_VISION.md) · [PHASE1](docs/STORM_CHASER_PHASE1.md) · [ROADMAP](docs/STORM_CHASER_ROADMAP.md)
- Build notes index: [`logs/README.md`](logs/README.md)

## Database

SQLite via Prisma — zero setup. To switch to Postgres later:

1. Change `provider = "sqlite"` to `"postgresql"` in `prisma/schema.prisma`
2. Update `DATABASE_URL` to your Postgres connection string
3. Run `go run github.com/steebchen/prisma-client-go db push`

## License

© 2026 [Saints Gaming](https://saintsgaming.net). All rights reserved. See [`LICENSE`](LICENSE) and [`docs/LEGAL.md`](docs/LEGAL.md).