# 2026-08-05 — Garage vehicle SVGs (smaller chase trucks)

Status: **in progress → implemented**

## Feedback
Garage icons were too large / not clearly storm-chase vehicles.

## Changes
- `frontend/src/app/core/vehicles.ts` — redrawn compact side-view chase fleet:
  - Tighter viewBox (`180×96`) with more padding so icons read smaller
  - Chase gear: antennas, radar dish, light bars, bed racks, bull bars, probe arm
  - Knobby tread wheels, bold outlines, glass shine
- Dashboard sizes reduced:
  - Profile equipped icon: `w-12 h-8`
  - Garage cards: `h-7` / `max-w-[7.5rem]`, lighter card padding

## Keys (unchanged)
`starter_car`, `radar_van`, `rescue_suv`, `research_truck`, `damage_pickup`, `tornado_interceptor`
