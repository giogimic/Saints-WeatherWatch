package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/saints-weatherwatch/backend/internal/nws"
	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

type overviewResponse struct {
	GeneratedAt    string   `json:"generatedAt"`
	TotalAlerts    int      `json:"totalAlerts"`
	SevereAlerts   int      `json:"severeAlerts"`
	WatchCount     int      `json:"watchCount"`
	Categories     []string `json:"categories"`
	TopHeadline    string   `json:"topHeadline"`
	MostAtRiskArea string   `json:"mostAtRiskArea"`
}

// Mount attaches all API routes to the provided router.
func Mount(r chi.Router, st *store.Store, cache *nws.Cache) {
	r.Route("/api", func(r chi.Router) {
		r.Get("/health", healthHandler(st))
		r.Get("/alerts", alertsHandler(cache))
		r.Get("/overview", overviewHandler(cache))
		r.Get("/history", historyHandler(st))
	})
}

// healthHandler reports server + DB readiness.
func healthHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status":     "ok",
			"serverTime": time.Now().UTC().Format(time.RFC3339),
			"service":    "saints-weatherwatch-backend",
		})
	}
}

func alertsHandler(cache *nws.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		payload := cache.Get()

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(payload)
	}
}

func overviewHandler(cache *nws.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		payload := cache.Get()
		categories := make([]string, 0, len(payload.Alerts))
		seen := map[string]struct{}{}
		for _, alert := range payload.Alerts {
			if _, ok := seen[alert.Category]; ok {
				continue
			}
			seen[alert.Category] = struct{}{}
			categories = append(categories, alert.Category)
		}

		response := overviewResponse{
			GeneratedAt:    payload.GeneratedAt,
			TotalAlerts:    len(payload.Alerts),
			SevereAlerts:   0,
			WatchCount:     0,
			Categories:     categories,
		}

		if len(payload.Alerts) > 0 {
			response.TopHeadline = payload.Alerts[0].Headline
			response.MostAtRiskArea = payload.Alerts[0].Area
		}

		for _, alert := range payload.Alerts {
			if alert.Severity == "Severe" || alert.Severity == "Extreme" {
				response.SevereAlerts++
			}
			if alert.Status == "watch" {
				response.WatchCount++
			}
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(response)
	}
}

func historyHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		
		if st == nil {
			_ = json.NewEncoder(w).Encode([]any{})
			return
		}

		ctx := r.Context()
		incidents, err := st.Client.TrackerIncident.FindMany().OrderBy(
			db.TrackerIncident.DatePulled.Order(db.SortOrderDesc),
		).Exec(ctx)

		if err != nil {
			http.Error(w, "Failed to load history", http.StatusInternalServerError)
			return
		}

		_ = json.NewEncoder(w).Encode(incidents)
	}
}
