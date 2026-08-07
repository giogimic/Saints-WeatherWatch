# Game Layer Systems

> Back to: [Research Index](./README.md)

Storm World / Radar Chase game systems — the simulation layer built on top of real weather data. Always labeled **SIMULATED EVENT · Gameplay Only · Not Real Weather**.

Related: [Storm Chaser Vision](../STORM_CHASER_VISION.md) · [Phase 1 Build Contract](../STORM_CHASER_PHASE1.md) · [Phased Roadmap](../STORM_CHASER_ROADMAP.md)

---

## Trust boundary (non-negotiable)

| Real ops (sacred) | Game layer |
|-------------------|------------|
| NWS alerts, radar, cams, archive, forecasts | Drops, SIM events, craft, trade, deployables, cosmetics |
| Never altered for gameplay drama | Always labeled when simulated |
| Official products stay readable | Bright / stylized game chrome only |

**SIMULATED EVENT · Gameplay Only · Not Real Weather** — every optional fantasy beat must stay visually and verbally distinct from official products.

---

## 1. Presence (shared world)

**Players see each other on the map in real time.**

| Property | Value |
|----------|-------|
| WebSocket | `GET /api/world/ws` (cookie session) |
| Tick rate | ~10 Hz snapshot (when 2+ chasers online) |
| Auth | Login required for Storm World |

### Implementation notes

- Clients send `move` when local position changes (rate-limited).
- Server is source of truth for positions; clamps speed.
- Server broadcasts a **presence snapshot** on a fixed tick (~10 Hz) when 2+ chasers are online.
- Join/leave/hello still push an immediate presence list.
- One WebSocket per user (reconnect replaces the old socket).
- Slow clients drop a frame instead of being kicked (game tick pattern, not chat-hub kick).
- Login required — no guest solo chase that looks like broken multiplayer.

### Phase 2 hardening

- Pickup/event cooldowns
- Hello teleport closed (first-hello-only snap)
- Snap ≤ pickup radius (`MaxActionSnapDeg`)
- Bag XP from item defs

---

## 2. Shared drops

**Server-spawned field scrap; first valid pickup wins.**

| Property | Value |
|----------|-------|
| Spawn authority | Server-side |
| Pickup validation | Distance gate + drop still unclaimed + login required |
| WS messages | `drops` (spawn/update), `drop_gone` (claimed/removed) |

### Drop catalog (Phase 1+2)

Common materials: scrap metal, wiring, batteries, copper, aluminum, plastic, electronics, fuel cans, camera parts, solar cells, GPS modules, radio components, tires, scientific notes, weather journals, blueprint fragments, storm photo opportunities, lost supply crates, abandoned research gear, wildlife/scenic/historic markers.

Rare finds: advanced sensors, lidar, precision instruments, satellite electronics, military surplus, prototype gear, legendary blueprint fragments.

### Regional spawn tables (Phase 3)

| Region | Examples |
|--------|----------|
| Forests | Wood, bio samples, plant data |
| Coast | Salt samples, ocean data, marine gear |
| Mountains | Minerals, geological samples, rare metals |
| Cities | Electronics, batteries, mechanical parts |
| Industrial | Steel, wiring, machinery |
| Farms | Fuel, chemicals, vehicle parts |

### Implementation notes

- Hand-authored land-cover zones (forest / coast / town / farm) — approximate Maine match.
- Biased material tables per zone.
- Lobby select + sharding (parallel rooms, same map; inventory/craft/trade stay global).

---

## 3. Simulated events (SIM)

**Rare labeled events; first to place objective marker wins reward.**

| Property | Value |
|----------|-------|
| Spawn authority | Server-side |
| Label | **SIMULATED EVENT · Gameplay Only · Not Real Weather** |
| WS messages | `event` (spawn), `event_done` (completed) |

### SIM event types

- Atmospheric Energy Surge
- Experimental Weather Balloon Failure
- Drone Swarm Recovery
- Lost Research Convoy
- Sensor Calibration
- Static Anomaly
- Magnetic Disturbance

### Implementation notes

- Bright, stylized visuals that cannot be confused with official products.
- First to place objective marker wins reward.
- SIM event grant failure reactivates the event.
- Denser respawns + more event types (Phase 2).

---

## 4. Craft

**Server recipe catalog; consume inputs → grant output.**

| Property | Value |
|----------|-------|
| API | `POST /api/world/craft` `{ recipeId }` |
| Auth | Cookie session |
| Validation | Recipe inputs exist in inventory |

### Implementation notes

- Server-authoritative recipe catalog.
- Craft refunds on grant failure.
- Phase 4: bind research sample + note → weather journal.
- Craft / trade / vendor rate limits.

---

## 5. Trade Center (Storm Market)

**List/barter listings; buy transfers both sides atomically.**

| Property | Value |
|----------|-------|
| APIs | `GET/POST /api/world/trades`, `POST .../buy`, `DELETE .../{id}` |
| Auth | Cookie session |
| Currency | Storm Credits |

### Implementation notes

- Trade buy/cancel uses status CAS (`open` → `sold`/`cancelled`).
- Reserves offered stack on listing creation.
- Atomic both-side transfer on buy.
- Vendor buy/sell + player barter.
- Craft / trade / vendor rate limits.

---

## 6. Weather-linked research (Phase 4)

**Awards research samples for time-on-station near real alert cells.**

| Property | Value |
|----------|-------|
| API | `GET /api/world/research` |
| Auth | Cookie session |
| Prisma model | `ResearchLogEntry` |

### Implementation notes

- World hub attaches read-only `nws.Cache` for research ticks (~20s).
- Time-on-station (~25s) within ~40 mi of an active alert cell → `research_sample`.
- Official alert severity/text **never** mutated for gameplay.
- Craft: bind research sample + note → weather journal.
- WS `research` HUD + Trade Center research log panel.
- Guardrails: SIM loot from real WX context only. No severity inflation. Server-authoritative grants.

---

## 7. Radar Chase mini-game

**Standalone chase game with loot + XP rewards.**

| Property | Value |
|----------|-------|
| API | `POST /api/chase/runs` |
| Auth | Cookie (optional — guests can play) |
| Duration | 60s runs |

### Implementation notes

- Leaflet mini-map over northern Maine with live IEM NEXRAD radar.
- Player marker = equipped garage truck SVG.
- Floating virtual joystick (bottom-left, low opacity) + WASD / arrow keys.
- Continuous movement via rAF; auto-pickup when close.
- Start fullscreen / in-run Fullscreen on phone and PC.
- Random weighted drops (common / uncommon / rare).
- `POST /api/chase/runs` validates keys (max 8), grants loot, awards XP.
- XP = item XP sum + 15 finish bonus if anything bagged.
- Guests can play; login/signup flushes `pendingChase`.

### Collectables catalog

| Item | Key |
|------|-----|
| Radar Core | `radar_core` |
| Hail Stone | `hail_stone` |
| Wind Flag | `wind_flag` |
| Storm Photo | `storm_photo` |
| Funnel Sketch | `funnel_sketch` |
| Lightning Chip | `lightning_chip` |
| Mesocyclone Coin | `mesocyclone_coin` |
| Chase Medal | `chase_medal` |

---

## 8. Chaser accounts & progression

**Name + 4-digit PIN auth with XP/level system.**

| Property | Value |
|----------|-------|
| Auth | Name + 4-digit PIN (bcrypt) |
| Session | HttpOnly cookie (`ww_session`) |
| XP | Item XP sum + finish bonuses |
| Level | Chaser level (unlocks vehicles, craft tiers) |

### Vehicle progression

| Vehicle | Key | Unlock |
|---------|-----|--------|
| Starter Car | `starter_car` | Default |
| Radar Van | `radar_van` | Chaser level |
| Rescue SUV | `rescue_suv` | Quiz track |
| Research Truck | `research_truck` | Chaser level |
| Damage Pickup | `damage_pickup` | Chaser level |
| Tornado Interceptor | `tornado_interceptor` | Chaser level |

### Dashboard

- Live cards: profile, progress, garage, favorite cams, watched areas, ops map.
- Layout show/hide persisted in `DashboardPreference`.
- Watched areas 25/50/100/150 mi; expand lists intersecting alerts.
- Profile nav (was Desk) — logged-in only.
- Desk loot: `/auth/me` inventory shows Storm World packs (MetaLookup bridge).

---

## 9. Lobbies & sharding (Phase 3)

**Parallel rooms on the same map; inventory/craft/trade stay global.**

| Property | Value |
|----------|-------|
| Lobby select | Yes |
| Sharding | Parallel rooms, same map |
| Global systems | Inventory, craft, trade |
| Presence | Rendezvous + lobby chat (mobile) |

---

## 10. Economy

**Storm Credits + item values + vendor prices.**

| Property | Value |
|----------|-------|
| Currency | Storm Credits |
| Item values | Per-item in catalog |
| Vendor | Buy/sell rates |
| Player barter | Trade Center listings |
| Rate limits | Craft / trade / vendor |

### Implementation notes

- `EnrichItemsJSON` adds value / vendor prices onto catalog item maps for API.
- Bag + Storm Market overlays (vendor buy/sell + player barter).
- Craft / trade / vendor rate limits.

---

## Future phases (aspirational)

### Phase 5 — Deployables & field networks

- Place probes/stations as persisted world entities
- Power / upkeep / collect-later loop
- Co-op claim rules (server-side)

### Phase 6 — Vehicles, cosmetics, contracts, economy depth

- Part tree beyond garage unlocks
- Marketplace contracts / cosmetics
- Capability unlocks (inventory size, craft tiers) layered on existing XP

### Vision items (not yet phased)

- Deployable equipment: basic/advanced probes, mobile stations, camera towers, lightning/wind/rain/pressure/temp sensors, balloons, research drones, solar chargers, satellite relays
- Vehicle progression: fuel, tires, storage, satcom, engine, suspension, radar, radio, sample collector, drone bay, solar + cosmetics
- Daily gameplay loop: check weather → plan route → collect → study → chase SIM → deploy → return → craft → trade → expand
- GIS land-cover tiles / finer region polygons

---

## Related documents

- [Internal API Endpoints](./INTERNAL_API_ENDPOINTS.md) — All `/api/world/*` and `/api/chase/*` routes
- [Backend & Infrastructure Tools](./BACKEND_INFRASTRUCTURE_TOOLS.md) — Go, Prisma, WebSocket
- [Storm Chaser Vision](../STORM_CHASER_VISION.md) — Full living-world north star
- [Storm Chaser Phase 1](../STORM_CHASER_PHASE1.md) — Build contract
- [Storm Chaser Roadmap](../STORM_CHASER_ROADMAP.md) — Phase 1–6 plan