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

## 2026-08-05 later — Docker deploy bug: stale backend binary

Symptom: after `./update.sh`, the frontend showed the new UI but reported
"Could not load camera list / Backend camera list unavailable."

Root cause: `docker-compose.yml` mounted the named volume `weatherwatch_db` at **`/app`** —
the same directory containing the compiled `server` binary. Docker seeds a named volume from
the image only when the volume is first created, so every subsequent `--build` produced a new
image whose `/app` was immediately shadowed by the old volume contents. The backend container
kept executing the **original** binary, which has no `/api/cams` route (nginx proxied fine;
the route simply didn't exist). The frontend has no volume, so it updated normally.

Fixes:
- `docker-compose.yml`: volume now `weatherwatch_db:/app/data`; default
  `DATABASE_URL=file:/app/data/weatherwatch.db`; frontend `depends_on: backend`
- `backend/Dockerfile`: `VOLUME ["/app/data"]`, `mkdir -p /app/data`
- `backend/entrypoint.sh`: normalizes `DATABASE_URL` to an absolute `file:` path so the Prisma
  CLI (schema-dir relative) and the Go server (cwd relative) target one file; creates the parent
  dir; `db push` failure now warns instead of killing the container
- `deploy-preview.sh`: SQLite URL → `/app/data/weatherwatch.db`
- `update.sh`: rewrites legacy `DATABASE_URL=file:/app/weatherwatch.db` in `.env`, and
  post-deploy verifies `/api/health` + `/api/cams`, flagging a stale build explicitly

## 2026-08-05 — Historical backfill and alert metadata

Symptom: the Maine archive remained empty after deployment. Persistence was working, but
the app only stored alerts observed while they were active after the new database started.
Maine had zero active alerts at startup, so there was nothing to show.

Research:
- `weather.im` is Iowa State/IEM's near-real-time IEMBot monitor. Its JSON service is
  `https://weather.im/iembot-json/room/{room}?seqnum=#`, but it is a recent-message feed,
  not the durable historical source needed here.
- The same IEM system provides a structured VTEC archive at
  `https://mesonet.agron.iastate.edu/json/vtec_events.py`. Verified 2026 CAR data includes
  historical Aroostook severe-thunderstorm warnings with issue/expiry timestamps.

Implementation:
- Startup + daily IEM VTEC backfill for CAR and GYX, current/previous year filtered to the
  most recent 18 months and locations explicitly containing `[ME]`
- Stable IDs (`iem-{WFO}-{year}-{code}-{eventID}`) make reruns idempotent
- New archive metadata: source, source URL, VTEC event code, issuing office, and status
- `datePulled` now represents actual issue time; active NWS records are repaired on upsert
- Archive cards now show region/source/code/office/status tags, issued and expiry timestamps,
  relative age, source links, four sort modes, and 25-entry pagination
- Live alert cards also show scope/source/event-code tags and explicit issue/expiry/office data

Verification:
- IEM backfill smoke test produced Maine rows with `IEM VTEC`, event codes such as `SV.W`,
  CAR/GYX office tags, and distinct issue/expiry timestamps
