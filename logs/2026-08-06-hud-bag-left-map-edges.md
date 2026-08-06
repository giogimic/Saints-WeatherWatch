# 2026-08-06 — HUD layout: Bag/Market left + edge map controls

Status: **implemented**

## Context
After pulling `origin/main`, Bag/Market dock existed globally (bottom-right) and map still used a bottom chip bar + radar strip. User wanted:

1. Bag + Market only on **Play** and **Profile** (`/play`, `/dashboard`)
2. Move Bag/Market to **bottom-left**
3. Scale so Bag + Market + Log fit on mobile (Log stays bottom-right)
4. Map radar/layer UI as discrete **side-edge buttons**, not a bar

## Changes
- `bag-market-dock.component.ts` — route gate via `NavigationEnd`; dock bottom-left; smaller mobile FABs; close overlay when leaving Play/Profile
- `logbook.component.ts` — bottom-right retained; smaller circle on mobile (`w-12` → `md:w-16`)
- `map.component.ts` — left edge layer toggles, top-right base chips, right-edge radar products/loop/scrub; mobile compact radar chip row; removed bottom chip bar + expandable radar desk strip

## Note
Profile = `/dashboard` (nav label). Account (`/account`) does not show Bag/Market.
