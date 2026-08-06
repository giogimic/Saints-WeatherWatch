package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/saints-weatherwatch/backend/internal/outages"
	"github.com/saints-weatherwatch/backend/internal/radar"
	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

func mountRadarRoutes(r chi.Router, st *store.Store, radarCache *radar.Cache, outageCache *outages.Cache) {
	r.Get("/radar/status", radarStatusHandler(radarCache, outageCache, st))
	r.Get("/radar/scans", radarScansHandler(radarCache))
}

func radarStatusHandler(radarCache *radar.Cache, outageCache *outages.Cache, st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if radarCache == nil {
			_ = json.NewEncoder(w).Encode(map[string]any{"error": "radar unavailable"})
			return
		}
		lat := radar.DefaultFocus.Lat
		lon := radar.DefaultFocus.Lon
		if v := r.URL.Query().Get("lat"); v != "" {
			if f, err := strconv.ParseFloat(v, 64); err == nil {
				lat = f
			}
		}
		if v := r.URL.Query().Get("lon"); v != "" {
			if f, err := strconv.ParseFloat(v, 64); err == nil {
				lon = f
			}
		}
		stStatus, err := radarCache.Status(lat, lon)
		if err != nil {
			http.Error(w, `{"error":"radar fetch failed"}`, http.StatusBadGateway)
			return
		}
		out := map[string]any{
			"generatedAt": stStatus.GeneratedAt,
			"focusLat":    stStatus.FocusLat,
			"focusLon":    stStatus.FocusLon,
			"nearest":     stStatus.Nearest,
			"composite":   stStatus.Composite,
			"products":    stStatus.Products,
			"latestScan":  stStatus.LatestScan,
			"sourceNote":  stStatus.SourceNote,
			"outagePair":  buildOutagePair(outageCache, st, r),
		}
		_ = json.NewEncoder(w).Encode(out)
	}
}

func radarScansHandler(radarCache *radar.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if radarCache == nil {
			_ = json.NewEncoder(w).Encode(map[string]any{"scans": []any{}})
			return
		}
		radarID := r.URL.Query().Get("radar")
		product := r.URL.Query().Get("product")
		hours := 2.0
		if v := r.URL.Query().Get("hours"); v != "" {
			if f, err := strconv.ParseFloat(v, 64); err == nil {
				hours = f
			}
		}
		res, err := radarCache.Client().FetchScans(radarID, product, hours)
		if err != nil {
			http.Error(w, `{"error":"scan list failed"}`, http.StatusBadGateway)
			return
		}
		_ = json.NewEncoder(w).Encode(res)
	}
}

func buildOutagePair(outageCache *outages.Cache, st *store.Store, r *http.Request) map[string]any {
	pair := map[string]any{
		"maineMetersOut": 0,
		"deltaMeters":    nil,
		"note":           "Pair radar loop with ME outage delta when ODIN samples exist.",
	}
	if outageCache != nil {
		snap := outageCache.Get()
		pair["maineMetersOut"] = snap.MaineMetersOut
		pair["maineCovered"] = snap.MaineCovered
		pair["outageSource"] = snap.Source
		pair["generatedAt"] = snap.GeneratedAt
	}
	if st == nil {
		return pair
	}
	rows, err := st.Client.OutageSnapshot.FindMany(
		db.OutageSnapshot.Scope.Equals("maine"),
	).OrderBy(
		db.OutageSnapshot.SampledAt.Order(db.SortOrderDesc),
	).Take(2).Exec(r.Context())
	if err != nil || len(rows) == 0 {
		return pair
	}
	pair["maineMetersOut"] = rows[0].MetersOut
	pair["sampledAt"] = rows[0].SampledAt.UTC().Format(time.RFC3339)
	if len(rows) >= 2 {
		delta := rows[0].MetersOut - rows[1].MetersOut
		pair["deltaMeters"] = delta
		pair["priorSampledAt"] = rows[1].SampledAt.UTC().Format(time.RFC3339)
		switch {
		case delta > 0:
			pair["note"] = "ME meters-out rose vs prior ODIN sample — watch radar for ongoing convection / wind."
		case delta < 0:
			pair["note"] = "ME meters-out fell vs prior ODIN sample — restoration may be underway."
		default:
			pair["note"] = "ME meters-out unchanged vs prior ODIN sample."
		}
	}
	return pair
}
