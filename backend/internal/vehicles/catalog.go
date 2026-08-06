package vehicles

import (
	"context"

	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

const StarterKey = "starter_car"

type Def struct {
	Key        string `json:"key"`
	Name       string `json:"name"`
	Blurb      string `json:"blurb"`
	UnlockHint string `json:"unlockHint"`
	MinLevel   int    `json:"minLevel"`
}

var Catalog = []Def{
	{Key: StarterKey, Name: "Starter Chase Car", Blurb: "Your first chase ride.", UnlockHint: "Create a chaser profile", MinLevel: 1},
	{Key: "radar_van", Name: "Radar Van", Blurb: "Rolling radar desk.", UnlockHint: "Level 2 + finish Radar Ace", MinLevel: 2},
	{Key: "rescue_suv", Name: "Rescue SUV", Blurb: "Built for safe intercepts.", UnlockHint: "Level 3 + finish Field Safety", MinLevel: 3},
	{Key: "research_truck", Name: "Research Truck", Blurb: "Science on wheels.", UnlockHint: "Level 4 + finish Storm Science", MinLevel: 4},
	{Key: "damage_pickup", Name: "Damage Survey Pickup", Blurb: "EF ladder ready.", UnlockHint: "Level 5 + finish EF Ladder", MinLevel: 5},
	{Key: "tornado_interceptor", Name: "Tornado Interceptor", Blurb: "Elite chase machine.", UnlockHint: "Level 8 + 90%+ on every track", MinLevel: 8},
}

// categoryVehicle maps quiz category → unlock key (needs 100% + MinLevel).
var categoryVehicle = map[string]string{
	"radar":   "radar_van",
	"safety":  "rescue_suv",
	"science": "research_truck",
	"history": "damage_pickup",
}

func IsKnown(key string) bool {
	for _, d := range Catalog {
		if d.Key == key {
			return true
		}
	}
	return false
}

func MinLevelFor(key string) int {
	for _, d := range Catalog {
		if d.Key == key {
			if d.MinLevel < 1 {
				return 1
			}
			return d.MinLevel
		}
	}
	return 1
}

// Grant creates ownership. Returns true only when newly unlocked.
func Grant(st *store.Store, ctx context.Context, userID, key string) bool {
	if st == nil || !IsKnown(key) {
		return false
	}
	_, err := st.Client.UserVehicle.CreateOne(
		db.UserVehicle.VehicleKey.Set(key),
		db.UserVehicle.User.Link(db.User.ID.Equals(userID)),
	).Exec(ctx)
	return err == nil
}

func owns(st *store.Store, ctx context.Context, userID, key string) bool {
	rows, err := st.Client.UserVehicle.FindMany(
		db.UserVehicle.UserID.Equals(userID),
		db.UserVehicle.VehicleKey.Equals(key),
	).Exec(ctx)
	return err == nil && len(rows) > 0
}

func bestPercent(st *store.Store, ctx context.Context, userID, category string) float64 {
	attempts, err := st.Client.QuizAttempt.FindMany(
		db.QuizAttempt.UserID.Equals(userID),
		db.QuizAttempt.Category.Equals(category),
	).Exec(ctx)
	if err != nil || len(attempts) == 0 {
		return 0
	}
	best := 0.0
	for _, a := range attempts {
		if a.Total <= 0 {
			continue
		}
		p := float64(a.Score) / float64(a.Total) * 100
		if p > best {
			best = p
		}
	}
	return best
}

// EvaluateAfterAttempt unlocks vehicles from this attempt + career bests + level.
func EvaluateAfterAttempt(st *store.Store, ctx context.Context, userID, category string, score, total, level int) []string {
	unlocked := []string{}
	if st == nil || userID == "" || total <= 0 {
		return unlocked
	}
	if level < 1 {
		level = 1
	}
	pct := float64(score) / float64(total) * 100

	if key, ok := categoryVehicle[category]; ok && pct >= 100 && level >= MinLevelFor(key) {
		if !owns(st, ctx, userID, key) && Grant(st, ctx, userID, key) {
			unlocked = append(unlocked, key)
		}
	}

	// Interceptor: level gate + career best >= 90% in all four categories
	if level >= MinLevelFor("tornado_interceptor") && !owns(st, ctx, userID, "tornado_interceptor") {
		cats := []string{"radar", "safety", "science", "history"}
		okAll := true
		for _, c := range cats {
			if bestPercent(st, ctx, userID, c) < 90 {
				okAll = false
				break
			}
		}
		if okAll && Grant(st, ctx, userID, "tornado_interceptor") {
			unlocked = append(unlocked, "tornado_interceptor")
		}
	}
	return unlocked
}
