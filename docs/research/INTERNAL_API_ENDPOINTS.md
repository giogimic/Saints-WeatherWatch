# Internal API Endpoints

> Back to: [Research Index](./README.md)

All REST and WebSocket routes exposed by the Go backend, grouped by domain.

---

## Health & Policy

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | None | Server health check (excluded from rate limit) |
| `GET` | `/api/policy` | None | Policy note: official APIs only; county/muni max; no address-level scraping |

---

## Alerts & Archive

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/alerts` | None | Live alerts (Maine-first, then capped national/canada) |
| `GET` | `/api/history` | None | Archive query (`?scope=maine\|national\|global\|usa\|canada`) |
| `GET` | `/api/storm-packages/export` | None | Storm package JSON export from archive |

---

## Radar

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/radar/status` | None | Nearest NEXRAD (CBW), product catalog, latest scan age |
| `GET` | `/api/radar/scans` | None | Available scan frames |

---

## Cameras

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/cams` | None | All cameras with health + near-alert enrichment |
| `GET` | `/api/cams/near-warnings` | None | Cameras near active NWS warnings |
| `GET` | `/api/cams/corridors` | None | Cameras grouped by corridor |

---

## Outages

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/outages` | None | Current outage data (all 16 ME counties) |
| `GET` | `/api/outages/geo` | None | Outage GeoJSON for map choropleth |
| `GET` | `/api/outages/history` | None | OutageSnapshot history for trend/delta |

---

## Hazards

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/hazards` | None | All hazards (flood + quakes) |
| `GET` | `/api/hazards/flood` | None | Flood gauge incidents only |
| `GET` | `/api/hazards/quakes` | None | Earthquake incidents only |
| `GET` | `/api/hazards/geo` | None | All hazards as GeoJSON for map |

---

## Auth & User

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/signup` | None | Chaser signup (name + 4-digit PIN, bcrypt) |
| `POST` | `/api/auth/login` | None | Chaser login (cookie session `ww_session`) |
| `POST` | `/api/auth/logout` | Cookie | Destroy session |
| `GET` | `/api/auth/me` | Cookie | Current user + loot inventory (MetaLookup bridge) |

---

## Locations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/locations` | Cookie | User saved locations (home-base pins) |
| `POST` | `/api/locations` | Cookie | Create saved location `{ label, lat, lon }` |
| `DELETE` | `/api/locations/{id}` | Cookie | Delete saved location |

---

## Vehicles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/vehicles/equip` | Cookie | Equip a garage vehicle |

---

## Play / Chase

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/chase/runs` | Cookie (optional) | Submit chase run; validates keys (max 8), grants loot, awards XP. Guests can play; login flushes `pendingChase`. |

---

## Storm World — Catalog & Inventory

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/world/catalog` | None | Item + recipe definitions |
| `GET` | `/api/world/inventory` | Cookie | My collectible stacks |

---

## Storm World — Craft

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/world/craft` | Cookie | Craft item `{ recipeId }` — consume inputs → grant output |

---

## Storm World — Trade Center

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/world/trades` | None | Open trade listings |
| `POST` | `/api/world/trades` | Cookie | Create listing (reserves offered stack) |
| `POST` | `/api/world/trades/{id}/buy` | Cookie | Complete barter (atomic both-side transfer) |
| `DELETE` | `/api/world/trades/{id}` | Cookie | Cancel listing (seller only) |

---

## Storm World — Research

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/world/research` | Cookie | Personal research log entries |

---

## WebSocket Endpoints

| Path | Auth | Description |
|------|------|-------------|
| `GET /ws` | Origin check | Ops WebSocket: real-time alert push (`snapshot`, `new_alerts`) |
| `GET /api/world/ws` | Cookie session | Storm World: presence + drops + events + research HUD |

### Ops WebSocket (`/ws`) message types

| Direction | Type | Description |
|-----------|------|-------------|
| Server → Client | `snapshot` | Full alert list (no new warnings) |
| Server → Client | `new_alerts` | Full alert list + `newAlerts` array (new warning IDs) |
| Client → Server | (none) | Client only listens; HTTP poll remains as fallback |

### Storm World WebSocket (`/api/world/ws`) message types

| Direction | Type | Description |
|-----------|------|-------------|
| Server → Client | `snapshot` | Full world state (presence + drops + events) |
| Server → Client | `presence` | Player list update |
| Server → Client | `drops` | Drop spawn/update |
| Server → Client | `drop_gone` | Drop claimed/removed |
| Server → Client | `event` | SIM event spawn |
| Server → Client | `event_done` | SIM event completed |
| Server → Client | `toast` | HUD notification |
| Server → Client | `research` | Research tick HUD update |
| Client → Server | `hello` | Initial join (first-hello-only snap) |
| Client → Server | `move` | Position update (lat/lon, rate-limited) |
| Client → Server | `pickup` | Request to pick up drop `{ dropId }` |
| Client → Server | `event_place` | Request to place SIM event `{ eventId }` |

---

## Rate limiting

| Property | Value |
|----------|-------|
| Scope | Public `GET` `/api/*` routes |
| Excluded | `/api/health`, WebSocket paths |
| Limit | ~120 req/min per client IP |
| Headers | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |
| 429 | JSON + `Retry-After` header |
| CORS | Rate-limit headers exposed |

---

## Security model (anti-cheat baseline)

1. **Server spawns** all world drops and simulated events.
2. Clients may send: `hello`, `move` (lat/lon), `pickup` (dropId), `event_place` (eventId).
3. Server validates: login required for mutations; distance gates; drop still unclaimed; recipe inputs exist; trade balances.
4. Inventory changes happen **only** in Go handlers / world room (Prisma `UserCollectible`).
5. Never accept "I picked item X" payloads that invent keys/counts.

### Soft launch mitigations

- Max speed clamp
- Pickup radius (`MaxActionSnapDeg`)
- Pickup / event_place cooldowns
- First-hello-only snap
- Action sync ≤ pickup radius
- Bagging awards catalog XP via `progress.AwardFlat`

---

## Related documents

- [Backend & Infrastructure Tools](./BACKEND_INFRASTRUCTURE_TOOLS.md) — Go, chi, Prisma, WebSocket
- [Game Layer Systems](./GAME_LAYER_SYSTEMS.md) — Storm World systems detail
- [Storm Chaser Phase 1](../STORM_CHASER_PHASE1.md) — Build contract