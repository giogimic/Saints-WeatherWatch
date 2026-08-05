# 2026-08-05 — Chaser accounts, rewards, live dashboard

Status: **implemented**

## Auth
- Chaser name + 4-digit PIN (bcrypt); optional email stored only (no outbound mail)
- HttpOnly cookie sessions (`ww_session`), PIN attempt rate limit / lockout
- Routes: `POST /api/auth/signup|login|logout`, `GET /api/auth/me`

## SPA shell
- `AuthService` + `OpsStateService` (shared alerts/cams/favorites/areas)
- Credentials interceptor; sticky nav + auth modal overlay (no full reload for login)
- Dashboard route guarded; Play stays public for guests

## Play / rewards
- Guest play + leaderboard; prompt to register to save progress
- Logged-in attempts attach `userId`; vehicle unlocks server-side
- Vehicles: starter_car, radar_van, rescue_suv, research_truck, damage_pickup, tornado_interceptor
- Garage on Dashboard; equip via `POST /api/vehicles/equip`

## Dashboard
- Live cards: profile, progress, garage, favorite cams, watched areas, ops map
- Layout show/hide persisted in `DashboardPreference`
- Watched areas 25/50/100/150 mi; expand lists intersecting alerts
- NWS alert geometry/centroids preserved for radius matching

## Favorites / pins
- `FavoriteCamera`, `WatchedArea`; SavedLocation private per user (login required to pin)

## Deploy note
Run Prisma `db push` on deploy so new tables exist. Rebuild backend after schema change.
