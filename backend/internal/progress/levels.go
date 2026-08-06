// Package progress awards quiz XP and derives chaser levels.
// Simple numbers on purpose: ~100 XP per level, clear for teen learners.
package progress

import (
	"context"

	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

const XPPerLevel = 100

// AttemptXP: +20 per correct, +10 finish bonus, +40 perfect bonus.
func AttemptXP(score, total int) int {
	if total <= 0 || score < 0 {
		return 0
	}
	if score > total {
		score = total
	}
	xp := score*20 + 10
	if score == total {
		xp += 40
	}
	return xp
}

func LevelFromXP(xp int) int {
	if xp < 0 {
		xp = 0
	}
	return 1 + xp/XPPerLevel
}

func XPProgress(xp int) (intoLevel, forNext int) {
	if xp < 0 {
		xp = 0
	}
	return xp % XPPerLevel, XPPerLevel
}

// Title is a short ego-positive rank label for the current level.
func Title(level int) string {
	switch {
	case level >= 12:
		return "Chase Captain"
	case level >= 10:
		return "Radar Expert"
	case level >= 8:
		return "Storm Chaser"
	case level >= 6:
		return "Field Spotter"
	case level >= 4:
		return "Spotter Trainee"
	case level >= 2:
		return "Storm Scout"
	default:
		return "Storm Rookie"
	}
}

type AwardResult struct {
	XPGained  int    `json:"xpGained"`
	XP        int    `json:"xp"`
	Level     int    `json:"level"`
	PrevLevel int    `json:"prevLevel"`
	LevelUp   bool   `json:"levelUp"`
	XPInto    int    `json:"xpIntoLevel"`
	XPForNext int    `json:"xpForNext"`
	Title     string `json:"title"`
}

// Award adds XP for a quiz attempt and persists level on the user.
func Award(st *store.Store, ctx context.Context, userID string, score, total int) (*AwardResult, error) {
	if st == nil || userID == "" {
		return nil, nil
	}
	gained := AttemptXP(score, total)
	user, err := st.Client.User.FindUnique(db.User.ID.Equals(userID)).Exec(ctx)
	if err != nil || user == nil {
		return nil, err
	}
	prevLevel := user.Level
	newXP := user.Xp + gained
	newLevel := LevelFromXP(newXP)
	updated, err := st.Client.User.FindUnique(db.User.ID.Equals(userID)).Update(
		db.User.Xp.Set(newXP),
		db.User.Level.Set(newLevel),
	).Exec(ctx)
	if err != nil {
		return nil, err
	}
	into, need := XPProgress(updated.Xp)
	return &AwardResult{
		XPGained:  gained,
		XP:        updated.Xp,
		Level:     updated.Level,
		PrevLevel: prevLevel,
		LevelUp:   updated.Level > prevLevel,
		XPInto:    into,
		XPForNext: need,
		Title:     Title(updated.Level),
	}, nil
}

// BackfillFromAttempts recomputes XP from saved attempts when a user still has 0 XP
// (e.g. accounts created before the level system). Keeps owned vehicles as-is.
func BackfillFromAttempts(st *store.Store, ctx context.Context, userID string) error {
	if st == nil || userID == "" {
		return nil
	}
	user, err := st.Client.User.FindUnique(db.User.ID.Equals(userID)).Exec(ctx)
	if err != nil || user == nil {
		return err
	}
	if user.Xp > 0 {
		return nil
	}
	attempts, err := st.Client.QuizAttempt.FindMany(db.QuizAttempt.UserID.Equals(userID)).Exec(ctx)
	if err != nil || len(attempts) == 0 {
		return err
	}
	total := 0
	for _, a := range attempts {
		total += AttemptXP(a.Score, a.Total)
	}
	if total <= 0 {
		return nil
	}
	_, err = st.Client.User.FindUnique(db.User.ID.Equals(userID)).Update(
		db.User.Xp.Set(total),
		db.User.Level.Set(LevelFromXP(total)),
	).Exec(ctx)
	return err
}
