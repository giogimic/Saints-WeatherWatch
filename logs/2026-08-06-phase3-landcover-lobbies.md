# 2026-08-06 — Phase 3 start: land cover + lobbies

## Clarification
Phase 3 core = regional/land-cover spawn bias.  
“Or sharding later” in the old roadmap = parallel rooms if the single room fills up.  
This slice starts both: approximate land cover **and** lobby select / sharding.

## Land cover (approximate Maine match)
- Zones: `forest` · `coast` · `city` (town) · `farm`
- Priority: city cores → coast strip → Aroostook farm belt → forest default
- `PickDropForPoint` biases material keys; drops carry `zone` in JSON

## Lobbies / sharding
- `world.Hub` owns multiple `Room` shards (main, alpha, bravo, practice)
- `GET /api/world/lobbies` — live counts
- `WS /api/world/ws?lobby=` — join shard; soft max; one user → one lobby
- Inventory / craft / trade remain global (Prisma)

## Frontend
- Ready screen lobby picker
- HUD: lobby name · online count · current zone

## Files
- `backend/internal/world/zones.go`, `hub.go`, `room.go`
- `backend/cmd/server/main.go`, `api/api.go`, `api/world_api.go`
- `frontend/.../world.service.ts`, `chase-game.component.ts`, `play.component.ts`
