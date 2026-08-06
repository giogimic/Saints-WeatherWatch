package api

import (
	"encoding/json"
	"net/http"

	"github.com/saints-weatherwatch/backend/internal/auth"
	"github.com/saints-weatherwatch/backend/internal/loot"
	"github.com/saints-weatherwatch/backend/internal/progress"
	"github.com/saints-weatherwatch/backend/internal/store"
	"github.com/saints-weatherwatch/backend/internal/vehicles"
)

func chaseLootCatalogHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(loot.Catalog)
	}
}

func myLootHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		_ = json.NewEncoder(w).Encode(loot.Inventory(st, r.Context(), user.ID))
	}
}

type chaseRunReq struct {
	Items   []string `json:"items"`
	Seconds int      `json:"seconds"`
}

// createChaseRunHandler saves collectables from a Radar Chase run and awards XP.
func createChaseRunHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if st == nil {
			http.Error(w, "DB not initialized", http.StatusInternalServerError)
			return
		}
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required to save loot", http.StatusUnauthorized)
			return
		}

		var req chaseRunReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}
		if req.Seconds < 0 {
			req.Seconds = 0
		}
		if req.Seconds > 600 {
			req.Seconds = 600
		}

		granted, itemXP := loot.ScoreRun(st, r.Context(), user.ID, req.Items)
		xpTotal := itemXP
		if len(granted) > 0 {
			xpTotal += 15 // finish bonus when anything was bagged
		}

		var award any
		level := user.Level
		if xpTotal > 0 {
			awarded, err := progress.AwardFlat(st, r.Context(), user.ID, xpTotal)
			if err == nil && awarded != nil {
				award = awarded
				level = awarded.Level
			}
		}

		// Level-ups from chase can unlock interceptor if quiz bests already qualify.
		unlocked := vehicles.EvaluateAfterAttempt(st, r.Context(), user.ID, "", 0, 1, level)

		_ = json.NewEncoder(w).Encode(map[string]any{
			"items":     granted,
			"inventory": loot.Inventory(st, r.Context(), user.ID),
			"award":     award,
			"unlocked":  unlocked,
			"seconds":   req.Seconds,
		})
	}
}
