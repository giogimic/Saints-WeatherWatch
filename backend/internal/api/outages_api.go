package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/saints-weatherwatch/backend/internal/outages"
	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

func mountOutageRoutes(r chi.Router, st *store.Store, cache *outages.Cache) {
	r.Get("/outages", outagesHandler(cache))
	r.Get("/outages/geo", outagesGeoHandler(cache))
	r.Get("/outages/history", outagesHistoryHandler(st))
}

func outagesHandler(cache *outages.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if cache == nil {
			_ = json.NewEncoder(w).Encode(map[string]any{"error": "outages unavailable"})
			return
		}
		_ = json.NewEncoder(w).Encode(cache.Get())
	}
}

func outagesGeoHandler(cache *outages.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		var fc map[string]any
		if err := json.Unmarshal(outages.MECountiesGeoJSON(), &fc); err != nil {
			http.Error(w, "geo unavailable", http.StatusInternalServerError)
			return
		}
		meters := map[string]int{}
		if cache != nil {
			for _, c := range cache.Get().Maine {
				meters[c.FIPS] = c.MetersOut
			}
		}
		features, _ := fc["features"].([]any)
		for _, raw := range features {
			f, ok := raw.(map[string]any)
			if !ok {
				continue
			}
			props, _ := f["properties"].(map[string]any)
			if props == nil {
				props = map[string]any{}
				f["properties"] = props
			}
			fips, _ := props["fips"].(string)
			if fips == "" {
				if id, ok := f["id"].(string); ok {
					fips = id
				}
			}
			m := meters[fips]
			props["metersOut"] = m
			props["hasOutage"] = m > 0
		}
		_ = json.NewEncoder(w).Encode(fc)
	}
}

func outagesHistoryHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if st == nil {
			_ = json.NewEncoder(w).Encode([]any{})
			return
		}
		limit := 48
		if v := r.URL.Query().Get("limit"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 200 {
				limit = n
			}
		}
		rows, err := st.Client.OutageSnapshot.FindMany(
			db.OutageSnapshot.Scope.Equals("maine"),
		).OrderBy(
			db.OutageSnapshot.SampledAt.Order(db.SortOrderDesc),
		).Take(limit).Exec(r.Context())
		if err != nil {
			_ = json.NewEncoder(w).Encode([]any{})
			return
		}
		out := make([]map[string]any, 0, len(rows))
		for _, row := range rows {
			item := map[string]any{
				"id":          row.ID,
				"metersOut":   row.MetersOut,
				"countiesOut": row.CountiesOut,
				"nationalOut": row.NationalOut,
				"source":      row.Source,
				"sampledAt":   row.SampledAt.UTC().Format(time.RFC3339),
			}
			if s, ok := row.SummaryJSON(); ok {
				item["summaryJson"] = s
			}
			out = append(out, item)
		}
		_ = json.NewEncoder(w).Encode(out)
	}
}
