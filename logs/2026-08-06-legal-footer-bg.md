# 2026-08-06 — Legal, footer, long-scroll background

## Goal

Finish leftover polish: Saints Gaming copyright/legal, footer link to
[saintsgaming.net](https://saintsgaming.net), docs cleanup, and a background
that holds up on tall pages without an obvious tile/repeat.

## Changes

### Legal / copyright

- Root [`LICENSE`](../LICENSE) — All rights reserved (Saints Gaming)
- [`docs/LEGAL.md`](../docs/LEGAL.md) — ownership, emergency disclaimer, data attribution, SIM note
- In-app `/legal` route (`frontend/src/app/features/legal/`)
- `index.html` author/copyright meta + HTML comment tag
- Site footer: © Saints Gaming · link to saintsgaming.net · Legal

### Background

- Replaced `.storm-bg` 400% animated tile with a **fixed** atmospheric
  `body::before` / vignette `body::after` (viewport-locked soft ellipses)
- Removed home page `repeating-linear-gradient` hatch; soft radial glow instead
- Learn page no longer stacks a redundant `storm-bg` layer

### Docs

- README publisher line + License section points at LICENSE / LEGAL.md
- PROJECT_OVERVIEW legal pointer
- This log + index entry

## Notes

Chalkboard logbook still uses a small repeating pattern inside the card chrome
(intentional UI texture, not the page background).
