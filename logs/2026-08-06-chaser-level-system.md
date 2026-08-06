# 2026-08-06 — Chaser level system (quizzes ↔ XP ↔ vehicles)

Status: **implemented**

## Rules (simple on purpose)
- **XP per quiz (logged-in):** `score×20` + `10` finish bonus + `40` if perfect
- **Level:** `1 + floor(xp / 100)` — 100 XP per level
- Titles: Rookie → Scout → Trainee → Spotter → Chaser → Radar Expert → Chase Captain

## Vehicle unlocks (level + quiz)
| Vehicle | Gate |
|---------|------|
| starter_car | Signup |
| radar_van | Level 2 + 100% Radar Ace |
| rescue_suv | Level 3 + 100% Field Safety |
| research_truck | Level 4 + 100% Storm Science |
| damage_pickup | Level 5 + 100% EF Ladder |
| tornado_interceptor | Level 8 + 90%+ best on all tracks |

## Backend
- `User.xp`, `User.level` in Prisma
- `internal/progress` — AttemptXP, Award, BackfillFromAttempts
- Quiz POST returns `{ attempt, unlocked, award }`
- `auth.UserView` includes xp/level/progress/title
- Existing accounts with attempts + 0 XP get a one-time backfill on `/me`

## Frontend
- Play hub: level bar when logged in; results show +XP / level-up
- Dashboard profile: level, title, XP bar
- Garage hints updated via catalog `unlockHint`

## Deploy
Prisma `db push` required for new User columns.
