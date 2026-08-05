# 🌪️ Saints Weather Watch

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
- [ ] **Phase 3** — Live map with animated radar, warning polygons, storm reports
- [ ] **Phase 4** — WebSocket live updates + new-warning banner
- [ ] **Phase 5** — Interactive Learn hub (tornado science, EF-scale, radar reading)
- [ ] **Phase 6** — Quiz + chase log (Prisma-backed)
- [ ] **Phase 7** — Chaser live streams + responsive polish + PWA
- [ ] **Phase 8** — Docker compose, embedded frontend, final polish

## Data Sources (all free, no API keys)

- **NWS API** (`api.weather.gov`) — active warnings & watches
- **Iowa State IEM** — storm reports + warning polygons
- **SPC** — convective outlooks, mesoscale discussions
- **RainViewer** — animated NEXRAD radar tiles
- **YouTube** — curated storm chaser live streams

## Docs

- [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Database

SQLite via Prisma — zero setup. To switch to Postgres later:

1. Change `provider = "sqlite"` to `"postgresql"` in `prisma/schema.prisma`
2. Update `DATABASE_URL` to your Postgres connection string
3. Run `go run github.com/steebchen/prisma-client-go db push`

## License

Personal project — built for fun and learning. 🌪️