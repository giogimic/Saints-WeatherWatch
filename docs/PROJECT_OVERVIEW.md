# Saints Weather Watch

## Summary

Saints Weather Watch is a storm tracking and weather education dashboard focused on teaching everyday users how to read alerts, understand radar-driven risk, and follow live weather visualizations more clearly. It is published by [Saints Gaming](https://saintsgaming.net).

## Goals

- make weather alerts easier to understand,
- show plain-language explanations for warning categories and zones,
- surface storm history in a digestible format,
- and present a teen-friendly, storm-chaser-inspired interface.

## Architecture

- Frontend: Angular 18 standalone app
- Backend: Go + chi router
- Data layer: Prisma client-go with SQLite for local dev
- Preview tooling: Linux shell script with Docker/Caddy detection

## Key directories

- `backend/` — Go API and Prisma-powered data layer
- `frontend/` — Angular app and UI routes
- `docs/` — deployment, legal, and project overview notes
- `deploy-preview.sh` — Linux preview bootstrap helper

## Legal

© 2026 Saints Gaming. See [`LEGAL.md`](./LEGAL.md) and the repository root [`LICENSE`](../LICENSE).
