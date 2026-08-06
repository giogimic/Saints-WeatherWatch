package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/saints-weatherwatch/backend/internal/hazards"
)

func mountHazardRoutes(r chi.Router, cache *hazards.Cache) {
	r.Get("/hazards", hazardsHandler(cache))
	r.Get("/hazards/flood", hazardsKindHandler(cache, "flood"))
	r.Get("/hazards/quakes", hazardsKindHandler(cache, "quakes"))
	r.Get("/hazards/geo", hazardsGeoHandler(cache))
}

func hazardsHandler(cache *hazards.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if cache == nil {
			_ = json.NewEncoder(w).Encode(map[string]any{"error": "hazards unavailable"})
			return
		}
		_ = json.NewEncoder(w).Encode(cache.Get())
	}
}

func hazardsKindHandler(cache *hazards.Cache, kind string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if cache == nil {
			_ = json.NewEncoder(w).Encode([]any{})
			return
		}
		snap := cache.Get()
		switch kind {
		case "flood":
			_ = json.NewEncoder(w).Encode(snap.Flood)
		case "quakes":
			_ = json.NewEncoder(w).Encode(snap.Quakes)
		default:
			_ = json.NewEncoder(w).Encode(snap.Incidents)
		}
	}
}

func hazardsGeoHandler(cache *hazards.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if cache == nil {
			_ = json.NewEncoder(w).Encode(map[string]any{"type": "FeatureCollection", "features": []any{}})
			return
		}
		kind := r.URL.Query().Get("kind")
		_ = json.NewEncoder(w).Encode(cache.GeoJSON(kind))
	}
}
