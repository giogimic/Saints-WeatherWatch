# 2026-08-05 — Quiz attempts API + Top Experts board

Status: **implemented**

## Backend
- `POST /api/quiz/attempts` — saves `QuizAttempt` (playerName, category, score, total, seconds)
- `GET /api/quiz/leaderboard?category=` — top 10 by score, then faster seconds
- Categories locked to `science | radar | safety | history`
- Callsign trimmed / capped at 32 chars; default `Storm Expert`

## Frontend
- Play hub: callsign field + **Top Experts** list
- On quiz finish: POSTs attempt; shows “Posted to Top Experts” when save succeeds
- Local best scores still kept in `localStorage`

## Deploy note
Prisma `QuizAttempt` table already in schema — `db push` / entrypoint should create it on next backend start if missing.
