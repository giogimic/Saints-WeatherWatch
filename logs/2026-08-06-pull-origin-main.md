# 2026-08-06 — Pull origin/main onto this PC

Status: **done**

## Why
Local `main` was stuck at `6f924e2` (chaser accounts). Remote had Bag/Market dock, Storm World, discrete map HUD, and later ops work — so Bag/Market icons were “on the project” but missing locally.

## Action
- `git fetch --all --prune`
- `git pull origin main` → fast-forward `6f924e2..8ec2f2a` (62 commits)
- Working tree clean; branch up to date with `origin/main`

## Now present locally
- `frontend/src/app/shared/components/bag-market-dock/bag-market-dock.component.ts`
- Map discrete HUD (`logs/2026-08-06-map-discrete-hud.md`)
- Storm World / trade / radar desk and related logs under `/logs/`

## Follow-up (user request still open)
User still wants: Bag/Market only on play + profile, move to bottom-left, scale so all 3 icons fit on mobile; radar desk more discrete around map edges if current discrete HUD isn’t enough.
