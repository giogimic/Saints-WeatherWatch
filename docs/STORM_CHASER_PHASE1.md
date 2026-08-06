# Storm Chaser — Phase 1 (build now)

Goal: a **simple, synchronized, server-authoritative** shared world slice on the northern Maine / St. John Valley map — people see each other, see the same drops/events, compete fairly, craft, and trade — without trusting the client for inventory.

## Security model (anti-cheat baseline)

1. **Server spawns** all world drops and simulated events.
2. Clients may send: `hello`, `move` (lat/lon), `pickup` (dropId), `event_place` (eventId).
3. Server validates: login required for mutations; distance gates; drop still unclaimed; recipe inputs exist; trade balances.
4. Inventory changes happen **only** in Go handlers / world room (Prisma `UserCollectible`).
5. Never accept “I picked item X” payloads that invent keys/counts.

Cheaters can still spoof position somewhat in Phase 1 (no full anti-teleport). Mitigations: max speed clamp, pickup radius, rate limits. Good enough for soft launch; harden later.

## Phase 1 features

| Feature | Behavior |
|---------|----------|
| Expanded map | Larger Maine corridor for Radar Chase / World |
| Presence | Logged-in players on `/api/world/ws` see other markers (~10 Hz snapshot tick) |
| Shared drops | Server respawns field scrap; first valid pickup wins |
| Simulated events | Rare labeled events; first to place objective marker wins reward |
| Craft | Server recipe catalog; consume inputs → grant output |
| Trade center | List/barter listings; buy transfers both sides atomically |

## APIs

- `GET /api/world/catalog` — item + recipe defs
- `GET /api/world/inventory` — my stacks (auth)
- `POST /api/world/craft` — `{ recipeId }` (auth)
- `GET /api/world/trades` — open listings
- `POST /api/world/trades` — create listing (auth, reserves ask? Phase1: reserves offered stack)
- `POST /api/world/trades/{id}/buy` — complete barter (auth)
- `DELETE /api/world/trades/{id}` — cancel (seller)
- `GET /api/world/ws` — presence + drops + events (cookie session)

## WS message types

Server → client: `snapshot`, `presence`, `drops`, `drop_gone`, `event`, `event_done`, `toast`  
Client → server: `hello`, `move`, `pickup`, `event_place`

## Presence (keep it boring)

Follow the usual casual authoritative pattern (not a custom protocol):

1. Clients send `move` when local position changes (rate-limited).
2. Server is source of truth for positions; clamps speed.
3. Server broadcasts a **presence snapshot** on a fixed tick (~10 Hz) when 2+ chasers are online — same idea as Gaffer/Gambetta snapshot sync, without full interpolation yet.
4. Join/leave/hello still push an immediate presence list.
5. One WebSocket per user (reconnect replaces the old socket).
6. Slow clients drop a frame instead of being kicked (chat-hub kick pattern is wrong for game ticks).

## Out of scope for Phase 1

Full MMO economy, deployable persistence networks, vehicle part tree, weather-typed research loops, anti-cheat physics, chat, entity interpolation buffers.

## Deploy

Prisma `db push` for `TradeListing` (+ any new tables). Rebuild backend + frontend. Ensure nginx upgrades `/api/` WebSockets (already configured).
