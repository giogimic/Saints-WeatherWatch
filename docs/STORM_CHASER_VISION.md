# Storm Chaser — Living Weather World

> **Grain of salt:** This is the long-term north star. It must not break or rewrite what already works.
> Ship in thin slices. Phase 1 (shared map, presence, drops, SIM events, craft, trade) stays the build contract.
> Details below that are not in Phase 1 are **aspirational** until a later phase doc promotes them.

Related: [STORM_CHASER_PHASE1.md](./STORM_CHASER_PHASE1.md) · [STORM_CHASER_ROADMAP.md](./STORM_CHASER_ROADMAP.md)

---

## Core vision

Storm Chaser is a persistent multiplayer exploration game built on top of a live weather map.

- The weather is **real**.
- The gameplay is **layered on top**.
- Players explore a region using live radar, satellite, forecasts, terrain, and weather data while collecting resources, researching storms, crafting scientific equipment, and competing to become great storm chasers.
- The goal is **never** to replace real weather information.
- Instead, the game transforms real weather into a living world of exploration, discovery, research, and progression.
- Every day feels different because the weather is different.

---

## Trust boundary (non-negotiable)

| Real ops (sacred) | Game layer |
|-------------------|------------|
| NWS alerts, radar, cams, archive, forecasts | Drops, SIM events, craft, trade, deployables, cosmetics |
| Never altered for gameplay drama | Always labeled when simulated |
| Official products stay readable | Bright / stylized game chrome only |

**SIMULATED EVENT · Gameplay Only · Not Real Weather** — every optional fantasy beat must stay visually and verbally distinct from official products.

---

## A living open world

The playable world should grow beyond a small map slice. Players freely drive the supported region:

Highways · small towns · forests · mountains · coastlines · lakes · rivers · national parks

Every area can bias different resources and weather patterns. **Weather itself becomes the world’s “biome.”**

**Today (Phase 1):** expanded Maine / St. John Valley corridor, open drive, shared presence.  
**Later:** true region-wide free roam with regional spawn tables.

---

## Camera

- Default zoom close enough to feel immersed
- Smooth zoom-out for planning
- Pinch (mobile) · wheel (desktop)
- Quick center · follow-vehicle · free exploration

**Today:** Leaflet chase map with limited zoom/pan during drive (stick owns input).  
**Later:** follow mode, planning zoom, pinch polish — without breaking immersive chase controls.

---

## Exploration never stops

Even on calm days, the map should generate small discoveries that make side roads worth driving:

Scrap metal · wiring · batteries · copper · aluminum · plastic · electronics · fuel cans · camera parts · solar cells · GPS modules · radio components · tires · scientific notes · weather journals · blueprint fragments · storm photo opportunities · lost supply crates · abandoned research gear · wildlife / scenic / historic markers

Rare finds: advanced sensors · lidar · precision instruments · satellite electronics · military surplus · prototype gear · legendary blueprint fragments

**Today:** server-spawned shared material drops (scrap, wiring, batteries, …) + craft inputs.  
**Later:** richer catalog, scenic/historic POIs, photography beats.

---

## Regional resources

Environments naturally bias what you find (encourages road trips):

| Region | Examples |
|--------|----------|
| Forests | Wood, bio samples, plant data |
| Coast | Salt samples, ocean data, marine gear |
| Mountains | Minerals, geological samples, rare metals |
| Cities | Electronics, batteries, mechanical parts |
| Industrial | Steel, wiring, machinery |
| Farms | Fuel, chemicals, vehicle parts |

**Today (Phase 3 start):** approximate forest / coast / town / farm tables + lobby shards.  
**Later:** true GIS land-cover / finer free-roam regions.

---

## Weather events (real phenomena → research)

Players earn rewards for **safely studying** real weather — never by faking warnings.

| Weather | Collect (examples) | Craft / unlock flavor |
|---------|--------------------|------------------------|
| Rain | Rainfall data, water samples, moisture | Analysis, calibration |
| Snow | Snow crystals, ice samples, temp profiles | Winter gear, frost sensors |
| Thunderstorms | Lightning data, E-field, pressure | High-tier electronics |
| Supercells | Rotation, wind profiles, meso samples | Rare blueprints, prestige |
| Hail | Hail cores, ice density | Reinforced parts / casings |
| High wind | Wind records, turbulence | Drone / flight systems |
| Coastal storms | Wave / surge / salt air | Marine research gear |
| Dense fog | Visibility, moisture density | Nav / mapping gear |
| Heat waves | Solar radiation, surface temp | Solar arrays, batteries |
| Cold outbreaks | Arctic air, ice formation | Cold-resistant components |

Research quality can depend on distance, equipment, probe placement, duration, sensors, and photography — players build a personal weather database over time.

**Today:** real weather is shown on the map (radar/alerts); game loot is not yet typed by live weather.  
**Later:** “study this alert cell” loops with server-validated research ticks.

---

## Simulated gameplay events

Optional events appear alongside real weather. Always marked:

**SIMULATED EVENT** · Gameplay Only · Not Real Weather

Bright, stylized visuals that cannot be confused with official products.

Examples: Atmospheric Energy Surge · Experimental Weather Balloon Failure · Drone Swarm Recovery · Lost Research Convoy · Sensor Calibration · Static Anomaly · Magnetic Disturbance

**Today:** Phase 1 SIM markers on the shared world (claim for reward).  
**Later:** richer event types and unique SIM-only materials.

---

## Deployable equipment

Players become mobile weather scientists: basic/advanced probes, mobile stations, camera towers, lightning / wind / rain / pressure / temp sensors, balloons, research drones, solar chargers, satellite relays — upgradable via crafting.

**Today:** craftable basic probe / repair kit / photo kit items (inventory).  
**Later:** placeable world entities with persistence and upkeep.

---

## Vehicle progression

Rolling laboratories: fuel, tires (off-road / snow / storm), storage, satcom, engine, suspension, radar, radio, sample collector, drone bay, solar — plus cosmetics (paint, light bars, wheels, decals, liveries).

**Today:** garage vehicles unlocked by chaser level / quiz tracks.  
**Later:** part tree and cosmetics economy.

---

## Crafting · field research · trading · progression

- Craft gear, parts, probes, repair kits, fuel, cameras, drones, stations, cosmetics
- Optional “builder” loop: deploy stations, power them, return for stored research
- Simple global marketplace: resources, blueprints, parts, cosmetics, contracts
- Progression via scientific capability (radar range, inventory, craft tiers, drones, prediction) — not combat power

**Today:** server-checked craft recipes + Trade Center barter.  
**Later:** contracts, cosmetics market, station networks, capability unlocks beyond XP/levels.

---

## Multiplayer

Players encounter each other naturally: drive together, convoys, share discoveries, trade, compete to document storms, cooperative probe nets, global research events. Outbreaks attract players without forced interaction.

**Today:** shared room — see each other (~10 Hz presence), same drops/events, first claim wins, trade.  
**Later:** parties, contracts, interest management if player counts grow.

---

## Daily gameplay loop (target)

1. Log in and check today’s live weather  
2. Review contracts / research goals  
3. Plan a route  
4. Collect exploration resources  
5. Study real weather for research data  
6. Chase optional SIM events for rare mats  
7. Deploy probes / equipment  
8. Return for accumulated research  
9. Craft upgrades  
10. Trade surplus  
11. Expand the network; prepare for tomorrow  

**Today:** check weather (ops app) → Storm World drive/scavenge/SIM → Trade & Craft.  
Steps 2, 5–8, 11 are future slices.

---

## Why this works

Storm Chaser is not a weather viewer with stickers. Calm days reward road trips, scavenging, photography, and stations. Active weather rewards careful study and competition. Optional SIM anomalies keep progression fun **without** polluting trust in real meteorological products. No two weather days are the same — that is the retention engine.

---

## Relation to the current product

Already in the live Saints Weather Watch app (ops + play):

- Map / radar / alerts / cams / archive / learn  
- Chaser accounts, garage, XP/levels, quizzes  
- Storm World Phase 1: shared presence, drops, SIM events, craft, trade  
- Alert WebSocket + banner  

**Rule of growth:** extend Phase 1 systems; do not replace the ops app or invent a second weather truth.
