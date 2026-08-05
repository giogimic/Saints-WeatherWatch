package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/saints-weatherwatch/backend/internal/cams"
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
func Mount(r chi.Router, st *store.Store, cache *nws.Cache, camCache *cams.Cache) {
	r.Route("/api", func(r chi.Router) {
		r.Get("/health", healthHandler(st))
		r.Get("/alerts", alertsHandler(cache))
		r.Get("/overview", overviewHandler(cache))
		r.Get("/history", historyHandler(st))
		r.Delete("/history/{id}", deleteHistoryHandler(st))

		// Chase Logs
		r.Get("/chaselogs", getChaseLogsHandler(st))
		r.Post("/chaselogs", createChaseLogHandler(st))
		r.Delete("/chaselogs/{id}", deleteChaseLogHandler(st))

		// Quiz attempts + leaderboard
		r.Get("/quiz/leaderboard", getQuizLeaderboardHandler(st))
		r.Post("/quiz/attempts", createQuizAttemptHandler(st))

		// Camera proxy + listing
		r.Get("/cams", camListHandler(camCache))
		r.Get("/cams/{id}", camImageHandler(camCache))
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
		
		var filters []db.TrackerIncidentWhereParam

		// Optional filters
		if search := r.URL.Query().Get("search"); search != "" {
			filters = append(filters, db.TrackerIncident.Or(
				db.TrackerIncident.Headline.Contains(search),
				db.TrackerIncident.Area.Contains(search),
				db.TrackerIncident.Source.Contains(search),
				db.TrackerIncident.Office.Contains(search),
				db.TrackerIncident.EventCode.Contains(search),
			))
		}
		if severity := r.URL.Query().Get("severity"); severity != "" {
			filters = append(filters, db.TrackerIncident.Severity.Equals(severity))
		}
		if category := r.URL.Query().Get("category"); category != "" {
			filters = append(filters, db.TrackerIncident.Category.Equals(category))
		}
		if scope := r.URL.Query().Get("scope"); scope != "" {
			if scope == "national" {
				filters = append(filters, db.TrackerIncident.Or(
					db.TrackerIncident.Scope.Equals("usa"),
					db.TrackerIncident.Scope.Equals("canada"),
				))
			} else {
				filters = append(filters, db.TrackerIncident.Scope.Equals(scope))
			}
		}
		if tornadoOnly := r.URL.Query().Get("tornadoOnly"); tornadoOnly == "true" {
			filters = append(filters, db.TrackerIncident.IsTornado.Equals(true))
		}

		incidents, err := st.Client.TrackerIncident.FindMany(filters...).OrderBy(
			db.TrackerIncident.DatePulled.Order(db.SortOrderDesc),
		).Exec(ctx)

		if err != nil {
			http.Error(w, "Failed to load history", http.StatusInternalServerError)
			return
		}

		_ = json.NewEncoder(w).Encode(incidents)
	}
}

func deleteHistoryHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if st == nil {
			http.Error(w, "DB not initialized", http.StatusInternalServerError)
			return
		}
		id := chi.URLParam(r, "id")
		_, err := st.Client.TrackerIncident.FindUnique(db.TrackerIncident.ID.Equals(id)).Delete().Exec(r.Context())
		if err != nil {
			http.Error(w, "Failed to delete incident", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

type createChaseLogReq struct {
	Title       string  `json:"title"`
	ChaseDate   string  `json:"chaseDate"` // ISO8601
	State       string  `json:"state"`
	Lat         *float64 `json:"lat,omitempty"`
	Lon         *float64 `json:"lon,omitempty"`
	EfRating    *int    `json:"efRating,omitempty"`
	MilesDriven int     `json:"milesDriven"`
	Notes       *string  `json:"notes,omitempty"`
}

func getChaseLogsHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if st == nil {
			_ = json.NewEncoder(w).Encode([]any{})
			return
		}

		logs, err := st.Client.ChaseLogEntry.FindMany().OrderBy(
			db.ChaseLogEntry.ChaseDate.Order(db.SortOrderDesc),
		).Exec(r.Context())

		if err != nil {
			http.Error(w, "Failed to fetch logs", http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(logs)
	}
}

func createChaseLogHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if st == nil {
			http.Error(w, "DB not initialized", http.StatusInternalServerError)
			return
		}

		var req createChaseLogReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		date, err := time.Parse(time.RFC3339, req.ChaseDate)
		if err != nil {
			http.Error(w, "Invalid date format", http.StatusBadRequest)
			return
		}

		optionalFields := []db.ChaseLogEntrySetParam{
			db.ChaseLogEntry.MilesDriven.Set(req.MilesDriven),
		}

		if req.Lat != nil {
			optionalFields = append(optionalFields, db.ChaseLogEntry.Lat.Set(*req.Lat))
		}
		if req.Lon != nil {
			optionalFields = append(optionalFields, db.ChaseLogEntry.Lon.Set(*req.Lon))
		}
		if req.EfRating != nil {
			optionalFields = append(optionalFields, db.ChaseLogEntry.EfRating.Set(*req.EfRating))
		}
		if req.Notes != nil {
			optionalFields = append(optionalFields, db.ChaseLogEntry.Notes.Set(*req.Notes))
		}

		entry, err := st.Client.ChaseLogEntry.CreateOne(
			db.ChaseLogEntry.Title.Set(req.Title),
			db.ChaseLogEntry.ChaseDate.Set(date),
			db.ChaseLogEntry.State.Set(req.State),
			optionalFields...,
		).Exec(r.Context())
		if err != nil {
			http.Error(w, "Failed to create log", http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(entry)
	}
}

func deleteChaseLogHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if st == nil {
			http.Error(w, "DB not initialized", http.StatusInternalServerError)
			return
		}
		id := chi.URLParam(r, "id")
		_, err := st.Client.ChaseLogEntry.FindUnique(db.ChaseLogEntry.ID.Equals(id)).Delete().Exec(r.Context())
		if err != nil {
			http.Error(w, "Failed to delete log", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

type createQuizAttemptReq struct {
	PlayerName string `json:"playerName"`
	Category   string `json:"category"` // science | radar | safety | history
	Score      int    `json:"score"`
	Total      int    `json:"total"`
	Seconds    int    `json:"seconds"`
}

var allowedQuizCategories = map[string]struct{}{
	"science": {},
	"radar":   {},
	"safety":  {},
	"history": {},
}

func createQuizAttemptHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if st == nil {
			http.Error(w, "DB not initialized", http.StatusInternalServerError)
			return
		}

		var req createQuizAttemptReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}

		name := strings.TrimSpace(req.PlayerName)
		if name == "" {
			name = "Storm Expert"
		}
		if len(name) > 32 {
			name = name[:32]
		}
		if _, ok := allowedQuizCategories[req.Category]; !ok {
			http.Error(w, "Invalid category", http.StatusBadRequest)
			return
		}
		if req.Total <= 0 || req.Score < 0 || req.Score > req.Total || req.Seconds < 0 {
			http.Error(w, "Invalid score", http.StatusBadRequest)
			return
		}

		entry, err := st.Client.QuizAttempt.CreateOne(
			db.QuizAttempt.PlayerName.Set(name),
			db.QuizAttempt.Category.Set(req.Category),
			db.QuizAttempt.Score.Set(req.Score),
			db.QuizAttempt.Total.Set(req.Total),
			db.QuizAttempt.Seconds.Set(req.Seconds),
		).Exec(r.Context())
		if err != nil {
			http.Error(w, "Failed to save attempt", http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(entry)
	}
}

func getQuizLeaderboardHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if st == nil {
			_ = json.NewEncoder(w).Encode([]any{})
			return
		}

		limit := 10
		category := strings.TrimSpace(r.URL.Query().Get("category"))

		q := st.Client.QuizAttempt.FindMany()
		if category != "" {
			if _, ok := allowedQuizCategories[category]; !ok {
				http.Error(w, "Invalid category", http.StatusBadRequest)
				return
			}
			q = st.Client.QuizAttempt.FindMany(
				db.QuizAttempt.Category.Equals(category),
			)
		}

		attempts, err := q.OrderBy(
			db.QuizAttempt.Score.Order(db.SortOrderDesc),
			db.QuizAttempt.Seconds.Order(db.SortOrderAsc),
			db.QuizAttempt.CreatedAt.Order(db.SortOrderDesc),
		).Take(limit).Exec(r.Context())
		if err != nil {
			http.Error(w, "Failed to fetch leaderboard", http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(attempts)
	}
}

func camListHandler(camCache *cams.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(camCache.ListMeta())
	}
}

func camImageHandler(camCache *cams.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")
		img, ok := camCache.GetImage(id)
		if !ok {
			http.Error(w, fmt.Sprintf("Camera %q not found or not yet cached", id), http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", img.ContentType)
		w.Header().Set("Cache-Control", "public, max-age=30")
		w.Header().Set("X-Last-Updated", img.LastUpdated.UTC().Format(time.RFC3339))
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(img.Data)))
		_, _ = w.Write(img.Data)
	}
}
