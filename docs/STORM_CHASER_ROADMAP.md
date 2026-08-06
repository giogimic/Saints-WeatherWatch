# Storm Chaser — Phased roadmap

> Vision is big; delivery stays thin. **Do not break** Phase 1 or the ops weather app to chase the full living-world doc.
> Promote ideas from [STORM_CHASER_VISION.md](./STORM_CHASER_VISION.md) into a phase only when the previous phase is stable.

## Phase 1 — Shared world slice (current build contract)

See [STORM_CHASER_PHASE1.md](./STORM_CHASER_PHASE1.md).

- Expanded Maine corridor · open drive (no timer)
- Presence (~10 Hz snapshots) · shared drops · SIM events
- Server-authoritative inventory · craft · trade center
- Trust labels on SIM content

**Status:** implemented on the Storm World branch; harden with playtests, do not rip out for bigger features.

## Phase 2 — Camera feel + exploration density (next candidate)

Small UX/content upgrades on the **existing** world room:

- Follow-vehicle / free camera toggle · safer zoom while not steering
- Richer drop catalog (still server-spawned) without regional biomes yet
- Clearer SIM chrome + toast copy
- Soft anti-cheat polish (already started: speed clamp, pickup radius)

**Out of scope here:** deployables, weather-typed research ticks, full region biomes.

## Phase 3 — Regional spawn tables

- Hand-authored or land-cover zones (forest / coast / city / farm …)
- Biased material tables per zone
- Still one authoritative room (or sharding later if needed)

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
