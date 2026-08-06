# 2026-08-06 — Bag, Storm Market, currency, Profile

## Context
Post Phase 4 (#18). User asked for loot/market overlays, craft/sell rate limits,
vendor + Storm Credits economy, and Desk → Profile (logged-in only).

## What shipped
- Floating **Bag** (medieval coin-bag SVG) + **Storm Market** dock when logged in
- Inventory overlay with hand-drawn item SVGs
- Market overlay: Buy (vendor + player listings) / Sell (vendor + barter list)
- `stormCredits` on User (start 75); item values; vendor buy ~65% / sell list price
- Per-user craft / trade / vendor pacing + qty/listing caps (stops SQLite freeze spam)
- Nav: Desk renamed **Profile**, shown only when logged in

## APIs
- `GET /api/world/inventory` → `{ stormCredits, items }`
- `GET /api/world/wallet`, `GET /api/world/vendor`
- `POST /api/world/vendor/sell|buy`
- Auth `/me` includes `stormCredits`

## Deploy
`prisma generate` + `db push` for `stormCredits` column.
