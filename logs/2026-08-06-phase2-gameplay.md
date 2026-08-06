# 2026-08-06 — Phase 2 gameplay slice

## Scope
Work on Storm World gameplay without breaking Phase 1 systems (presence, craft, trade, server inventory).

## Shipped
### Camera
- Default zoom closer (10)
- **Follow** / **Free** cam toggles + **Center**
- Wheel + pinch zoom; drag only in Free (stick still disables drag while steering)

### Exploration density (server)
- More materials: copper, aluminum, electronics, scientific notes, solar cells, spare tires, weather journals
- New crafts: Field Journal, Solar Pack
- More drops on the map (target 55, seed ~22, faster respawn)
- Six SIM event types (always labeled not real weather)

### SIM UX
- Map pin: SIM / NOT REAL WX
- Bottom HUD with label + distance / in-range hint

## Files
- `backend/internal/world/room.go`
- `frontend/.../chase-game.component.ts`, `styles.scss`
- `docs/STORM_CHASER_ROADMAP.md`
