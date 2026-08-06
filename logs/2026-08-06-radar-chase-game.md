# 2026-08-06 — Radar Chase mini-game + profile loot

Status: **implemented**

## Game (Play → Radar Chase)
- Leaflet mini-map over northern Maine with live IEM NEXRAD radar
- Player marker = equipped garage truck SVG
- Floating virtual joystick (bottom-left, low opacity) + WASD / arrow keys
- Continuous movement via rAF; 60s runs; auto-pickup when close
- Random weighted drops (common / uncommon / rare)

## Collectables
- Prisma `UserCollectible` (itemKey + count)
- Catalog: radar_core, hail_stone, wind_flag, storm_photo, funnel_sketch, lightning_chip, mesocyclone_coin, chase_medal
- `POST /api/chase/runs` (login) validates keys (max 8), grants loot, awards XP
- XP = item XP sum + 15 finish bonus if anything bagged
- Guests can play; login/signup flushes `pendingChase`

## Profile / Dashboard
- `UserView.loot` inventory on `/api/auth/me`
- New Dashboard card **Field loot**
- Profile line shows loot count

## Deploy
Prisma `db push` for `UserCollectible` (+ default prefs string includes `loot`).
