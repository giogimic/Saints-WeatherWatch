package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/saints-weatherwatch/backend/internal/auth"
	"github.com/saints-weatherwatch/backend/internal/geo"
	"github.com/saints-weatherwatch/backend/internal/nws"
	"github.com/saints-weatherwatch/backend/internal/outages"
	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

func getFavoritesHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		rows, err := st.Client.FavoriteCamera.FindMany(db.FavoriteCamera.UserID.Equals(user.ID)).Exec(r.Context())
		if err != nil {
			http.Error(w, "Failed to load favorites", http.StatusInternalServerError)
			return
		}
		ids := make([]string, 0, len(rows))
		for _, row := range rows {
			ids = append(ids, row.CameraID)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"cameraIds": ids})
	}
}

type favoriteBody struct {
	CameraID string `json:"cameraId"`
}

func addFavoriteHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		var req favoriteBody
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.CameraID) == "" {
			http.Error(w, "Invalid camera", http.StatusBadRequest)
			return
		}
		row, err := st.Client.FavoriteCamera.CreateOne(
			db.FavoriteCamera.CameraID.Set(strings.TrimSpace(req.CameraID)),
			db.FavoriteCamera.User.Link(db.User.ID.Equals(user.ID)),
		).Exec(r.Context())
		if err != nil {
			// already favorited
			_ = json.NewEncoder(w).Encode(map[string]any{"cameraId": req.CameraID})
			return
		}
		_ = json.NewEncoder(w).Encode(row)
	}
}

func removeFavoriteHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		camID := chi.URLParam(r, "cameraId")
		row, err := st.Client.FavoriteCamera.FindFirst(
			db.FavoriteCamera.UserID.Equals(user.ID),
			db.FavoriteCamera.CameraID.Equals(camID),
		).Exec(r.Context())
		if err == nil && row != nil {
			_, _ = st.Client.FavoriteCamera.FindUnique(db.FavoriteCamera.ID.Equals(row.ID)).Delete().Exec(r.Context())
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

func getWatchedAreasHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		rows, err := st.Client.WatchedArea.FindMany(db.WatchedArea.UserID.Equals(user.ID)).OrderBy(
			db.WatchedArea.CreatedAt.Order(db.SortOrderDesc),
		).Exec(r.Context())
		if err != nil {
			http.Error(w, "Failed to load areas", http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(rows)
	}
}

type watchedAreaBody struct {
	Label       string  `json:"label"`
	Lat         float64 `json:"lat"`
	Lon         float64 `json:"lon"`
	RadiusMiles int     `json:"radiusMiles"`
}

func createWatchedAreaHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		var req watchedAreaBody
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}
		label := strings.TrimSpace(req.Label)
		if label == "" {
			label = "Watch zone"
		}
		if len(label) > 48 {
			label = label[:48]
		}
		radius := req.RadiusMiles
		allowed := map[int]bool{25: true, 50: true, 100: true, 150: true}
		if !allowed[radius] {
			radius = 50
		}
		if req.Lat < -90 || req.Lat > 90 || req.Lon < -180 || req.Lon > 180 {
			http.Error(w, "Invalid coordinates", http.StatusBadRequest)
			return
		}
		row, err := st.Client.WatchedArea.CreateOne(
			db.WatchedArea.Label.Set(label),
			db.WatchedArea.Lat.Set(req.Lat),
			db.WatchedArea.Lon.Set(req.Lon),
			db.WatchedArea.User.Link(db.User.ID.Equals(user.ID)),
			db.WatchedArea.RadiusMiles.Set(radius),
		).Exec(r.Context())
		if err != nil {
			http.Error(w, "Failed to save area", http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(row)
	}
}

func deleteWatchedAreaHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		id := chi.URLParam(r, "id")
		row, err := st.Client.WatchedArea.FindUnique(db.WatchedArea.ID.Equals(id)).Exec(r.Context())
		if err != nil || row == nil || row.UserID != user.ID {
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
		_, _ = st.Client.WatchedArea.FindUnique(db.WatchedArea.ID.Equals(id)).Delete().Exec(r.Context())
		w.WriteHeader(http.StatusNoContent)
	}
}

type matchedAlert struct {
	nws.Alert
	Approximate bool `json:"approximate"`
}

func expandWatchedAreaHandler(st *store.Store, cache *nws.Cache, outageCache *outages.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		id := chi.URLParam(r, "id")
		area, err := st.Client.WatchedArea.FindUnique(db.WatchedArea.ID.Equals(id)).Exec(r.Context())
		if err != nil || area == nil || area.UserID != user.ID {
			http.Error(w, "Not found", http.StatusNotFound)
			return
		}
		payload := cache.Get()
		matched := make([]matchedAlert, 0)
		for _, a := range payload.Alerts {
			okMatch, approx := geo.AlertMatchesRadius(area.Lat, area.Lon, float64(area.RadiusMiles), a.CentroidLat, a.CentroidLon, a.Geometry)
			if okMatch {
				matched = append(matched, matchedAlert{Alert: a, Approximate: approx})
			}
		}
		res := map[string]any{
			"area":   area,
			"alerts": matched,
			"count":  len(matched),
		}
		if outageCache != nil {
			res["outage"] = outageCache.CorrelateArea(area.Lat, area.Lon)
		}
		_ = json.NewEncoder(w).Encode(res)
	}
}

func getDashboardPrefsHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		row, err := st.Client.DashboardPreference.FindUnique(db.DashboardPreference.UserID.Equals(user.ID)).Exec(r.Context())
		if err != nil || row == nil {
			_ = json.NewEncoder(w).Encode(map[string]any{
				"cardOrder":   "profile,progress,garage,loot,cams,areas,map",
				"hiddenCards": "",
				"mapLayers":   "radar,warnings,cams",
			})
			return
		}
		_ = json.NewEncoder(w).Encode(row)
	}
}

type prefsBody struct {
	CardOrder   string `json:"cardOrder"`
	HiddenCards string `json:"hiddenCards"`
	MapLayers   string `json:"mapLayers"`
}

func saveDashboardPrefsHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		var req prefsBody
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}
		if req.CardOrder == "" {
			req.CardOrder = "profile,progress,garage,loot,cams,areas,map"
		}
		if req.MapLayers == "" {
			req.MapLayers = "radar,warnings,cams"
		}
		existing, _ := st.Client.DashboardPreference.FindUnique(db.DashboardPreference.UserID.Equals(user.ID)).Exec(r.Context())
		if existing == nil {
			row, err := st.Client.DashboardPreference.CreateOne(
				db.DashboardPreference.User.Link(db.User.ID.Equals(user.ID)),
				db.DashboardPreference.CardOrder.Set(req.CardOrder),
				db.DashboardPreference.HiddenCards.Set(req.HiddenCards),
				db.DashboardPreference.MapLayers.Set(req.MapLayers),
			).Exec(r.Context())
			if err != nil {
				http.Error(w, "Failed to save", http.StatusInternalServerError)
				return
			}
			_ = json.NewEncoder(w).Encode(row)
			return
		}
		row, err := st.Client.DashboardPreference.FindUnique(db.DashboardPreference.UserID.Equals(user.ID)).Update(
			db.DashboardPreference.CardOrder.Set(req.CardOrder),
			db.DashboardPreference.HiddenCards.Set(req.HiddenCards),
			db.DashboardPreference.MapLayers.Set(req.MapLayers),
		).Exec(r.Context())
		if err != nil {
			http.Error(w, "Failed to save", http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(row)
	}
}

func myQuizStatsHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		rows, err := st.Client.QuizAttempt.FindMany(db.QuizAttempt.UserID.Equals(user.ID)).OrderBy(
			db.QuizAttempt.CreatedAt.Order(db.SortOrderDesc),
		).Take(50).Exec(r.Context())
		if err != nil {
			http.Error(w, "Failed to load stats", http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(rows)
	}
}
