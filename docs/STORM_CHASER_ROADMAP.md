# Storm Chaser — Phased roadmap

> Vision is big; delivery stays thin. **Do not break** Phase 1 or the ops weather app to chase the full living-world doc.
> Promote ideas from [STORM_CHASER_VISION.md](./STORM_CHASER_VISION.md) into a phase only when the previous phase is stable.

## Phase 1 — Shared world slice — **done**

See [STORM_CHASER_PHASE1.md](./STORM_CHASER_PHASE1.md).

- [x] Expanded Maine corridor · open drive (no timer)
- [x] Presence (~10 Hz snapshots) · shared drops · SIM events
- [x] Server-authoritative inventory · craft · trade center
- [x] Trust labels on SIM content
- [x] Harden: Desk loot, trade CAS, event rollback, End leaves world

## Phase 2 — Camera feel + exploration density — **done**

- [x] Follow-vehicle / free camera toggle · center · wheel/pinch zoom
- [x] Richer drop catalog (still server-spawned) without regional biomes yet
- [x] Clearer SIM chrome + toast / HUD copy
- [x] More SIM event types · denser respawns
- [x] Soft anti-cheat polish: pickup/event cooldowns, hello teleport closed, snap ≤ pickup radius, bag XP from item defs

**Out of scope here:** deployables, weather-typed research ticks, full region biomes.

## Phase 3 — Regional spawn tables + lobbies — **in progress**

- [x] Hand-authored land-cover zones (forest / coast / town / farm) — approximate Maine match
- [x] Biased material tables per zone
- [x] Lobby select + sharding (parallel rooms, same map; inventory/craft/trade stay global)
- [x] Presence rendezvous + lobby chat (mobile)
- [ ] Optional: GIS land-cover tiles / finer region polygons

## Phase 4 — Weather-linked research (real phenomena)

- Server reads live alerts/radar context; awards **research** stacks for time-on-station
- Never mutates official alert text or severity for gameplay
- Personal research log / database UI

## Phase 5 — Deployables & field networks

- Place probes/stations as persisted world entities
- Power / upkeep / collect-later loop
- Co-op claim rules (server-side)

## Phase 6 — Vehicles, cosmetics, contracts, economy depth

- Part tree beyond garage unlocks
- Marketplace contracts / cosmetics
- Capability unlocks (inventory size, craft tiers) layered on existing XP

## Guardrails for every phase

1. Real weather products stay trustworthy.  
2. Inventory mutations stay server-side.  
3. Prefer extending `/api/world` + the world room over a second game backend.  
4. If a feature needs a week of greenfield rewrite, it is the wrong next slice.
