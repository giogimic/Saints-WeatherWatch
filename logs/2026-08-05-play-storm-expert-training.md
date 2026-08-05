# 2026-08-05 — Play: Storm Expert Training quizzes

Status: **implemented** (interactive quizzes; Chase Log left alone)

## Audience framing
- Ages ~16–18, including learners with developmental / learning disabilities
- Visual, large tap targets, plain language
- Ego-positive: “Storm Expert Training,” ranks, “Expert call” feedback (never punitive)

## What’s live on Play
Four tracks (match `QuizAttempt.category` values for later API):
- **Radar Ace** (`radar`) — hook, couplet, cores, path safety
- **EF Ladder** (`history`) — damage → EF rating
- **Field Safety** (`safety`) — watch vs warning, shelter, flood, lightning
- **Storm Science** (`science`) — ingredients, shear, supercell, shelf, hail

Flow: hub → question deck (shuffled) → immediate feedback → results + rank  
Progress: best % / score per track in `localStorage` (`ww-play-progress-v1`)  
Simple original SVG diagrams (no third-party radar slides)

## Chase Log / mini-game
- **Left as-is.** Archive already owns chase CRUD.
- Play only links “Chase Reports → Archive” with a note that a map chase mini-game is later.
- Future idea (not built): walk/drive on map toward radar cores — theorize after quizzes + ops polish.

## Files
- `frontend/src/app/features/play/play.component.ts`
- `frontend/src/app/features/play/play.questions.ts`

## Follow-ups (optional)
- Wire `QuizAttempt` POST + leaderboard
- Outbreak replay / SavedLocation / map chase mini-game
