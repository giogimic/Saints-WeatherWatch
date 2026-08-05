package vehicles

import (
	"context"

	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

const StarterKey = "starter_car"

type Def struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Blurb       string `json:"blurb"`
	UnlockHint  string `json:"unlockHint"`
}

var Catalog = []Def{
	{Key: StarterKey, Name: "Starter Chase Car", Blurb: "Your first chase ride.", UnlockHint: "Create a chaser profile"},
	{Key: "radar_van", Name: "Radar Van", Blurb: "Rolling radar desk.", UnlockHint: "Finish Radar Ace"},
	{Key: "rescue_suv", Name: "Rescue SUV", Blurb: "Built for safe intercepts.", UnlockHint: "Finish Field Safety"},
	{Key: "research_truck", Name: "Research Truck", Blurb: "Science on wheels.", UnlockHint: "Finish Storm Science"},
	{Key: "damage_pickup", Name: "Damage Survey Pickup", Blurb: "EF ladder ready.", UnlockHint: "Finish EF Ladder"},
	{Key: "tornado_interceptor", Name: "Tornado Interceptor", Blurb: "Elite chase machine.", UnlockHint: "Score 90%+ on every track"},
}

func IsKnown(key string) bool {
	for _, d := range Catalog {
		if d.Key == key {
			return true
		}
	}
	return false
}

func Grant(st *store.Store, ctx context.Context, userID, key string) error {
	if st == nil || !IsKnown(key) {
		return nil
	}
	_, err := st.Client.UserVehicle.CreateOne(
		db.UserVehicle.VehicleKey.Set(key),
		db.UserVehicle.User.Link(db.User.ID.Equals(userID)),
	).Exec(ctx)
	if err != nil {
		// unique constraint = already owned
		return nil
	}
	return nil
}

// EvaluateAfterAttempt unlocks vehicles based on this attempt + career bests.
func EvaluateAfterAttempt(st *store.Store, ctx context.Context, userID, category string, score, total int) []string {
	unlocked := []string{}
	if st == nil || userID == "" || total <= 0 {
		return unlocked
	}
	pct := float64(score) / float64(total) * 100
	if pct >= 100 {
		switch category {
		case "radar":
			if err := Grant(st, ctx, userID, "radar_van"); err == nil {
				unlocked = append(unlocked, "radar_van")
			}
		case "safety":
			if err := Grant(st, ctx, userID, "rescue_suv"); err == nil {
				unlocked = append(unlocked, "rescue_suv")
			}
		case "science":
			if err := Grant(st, ctx, userID, "research_truck"); err == nil {
				unlocked = append(unlocked, "research_truck")
			}
		case "history":
			if err := Grant(st, ctx, userID, "damage_pickup"); err == nil {
				unlocked = append(unlocked, "damage_pickup")
			}
		}
	}

	// Interceptor: best >= 90% in all four categories
	cats := []string{"radar", "safety", "science", "history"}
	okAll := true
	for _, c := range cats {
		attempts, err := st.Client.QuizAttempt.FindMany(
			db.QuizAttempt.UserID.Equals(userID),
			db.QuizAttempt.Category.Equals(c),
		).Exec(ctx)
		if err != nil || len(attempts) == 0 {
			okAll = false
			break
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
		if best < 90 {
			okAll = false
			break
		}
	}
	if okAll {
		_ = Grant(st, ctx, userID, "tornado_interceptor")
		unlocked = append(unlocked, "tornado_interceptor")
	}
	return unlocked
}
