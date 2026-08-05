# 2026-08-05 — Live cameras + alert archive (implementation)

Status: **implemented** (questionnaire answers applied)

## Decisions locked in

1. **Cameras:** ~150–200 km corridor centered on Northern Maine / St. John Valley (coords `47.05, -68.35` — not branded as a single town). Closest feeds first, expand outward, page capped (~16 road/field + satellite/radar).
2. **Discovery:** Runtime refresh from opencctv.org hourly, with committed `backend/internal/cams/fallback.json`.
3. **Archive scopes:** Maine first · USA & Canada · Global (placeholder until a non-US/CA source is wired).

## What changed

### Database (archive root cause)

- Single DB path: `backend/data/weatherwatch.db`
- `godotenv` now loaded in `cmd/server/main.go`
- `store.New` absolutizes `file:` URLs so Go cwd and Prisma schema-dir resolution can share one file
- `run-dev.bat` / `entrypoint.sh` run `prisma db push` with `file:../data/weatherwatch.db` (relative to `prisma/`), then start the server with `file:./data/weatherwatch.db`
- Schema: `TrackerIncident.scope` (`maine|usa|canada|global`)

### Alerts / archive

- Maine pulled via `?area=ME` first (never starved by national top-N)
- National USA: Extreme/Severe (+ tornado/hurricane/blizzard) archived as `usa`
- Canada: Environment Canada Atom feeds for NB + QC → `canada`
- Live `/api/alerts` is Maine-first, then capped national/canada
- Upsert failures are logged with saved/failed counts (no longer silent)
- Archive UI: Region Scope filter (Maine / USA & Canada / Global)
- `/api/history?scope=maine|national|global|usa|canada`

### Cameras

- Dead MDOT + GOES16 URLs removed
- GOES19 `.../latest.jpg` + NOAA radar kept as static imagery
- Fallback list from opencctv (FAA, NB 511, NE 511, USGS Dickey, FKOC, Smyrna I-95, etc.)
- FAA `faa-weathercam://ID` resolved via `weathercams.faa.gov/api`
- Runtime tiled discovery from `opencctv.org/api/cameras?bounds=`
- New `GET /api/cams` listing; `live.component.ts` consumes it (removed fabricated YouTube cams)

## Smoke test (2026-08-05)

- Archive upsert: `saved=45 failed=0`
- `/api/cams`: 19 feeds, status LIVE (FAA/NB/NE/USGS/GOES/radar)
- Maine NWS quiet at test time → archived rows were `usa` scope (expected); Maine tab fills when ME has alerts

## Follow-ups (optional)

- Wire a real “global” alert source if desired
- Expand Canada beyond NB/QC warning feeds
- Commit strategy for `internal/store/gen` (still gitignored)
