# 2026-08-05 — README sync + SavedLocation home-base pins

Status: **implemented**

## README
Roadmap checkboxes updated to match shipped work (map layers, learn, play quizzes + leaderboard, live cams, docker). Data sources list corrected (removed unused YouTube/RainViewer claims; added real IEM/SPC/GOES sources). Pointed to `logs/`.

## SavedLocation
Already in Prisma schema with no routes/UI.

### API
- `GET /api/locations`
- `POST /api/locations` `{ label, lat, lon }`
- `DELETE /api/locations/{id}`

### Map UI
- **Home base** card in Map side panel / mobile sheet
- Pin current map center with a label
- Fly-to + delete; 🏠 markers always visible on the canvas
