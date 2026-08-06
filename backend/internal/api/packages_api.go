package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/saints-weatherwatch/backend/internal/nws"
	"github.com/saints-weatherwatch/backend/internal/ops"
	"github.com/saints-weatherwatch/backend/internal/outages"
	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

func mountStormPackageRoutes(r chi.Router, st *store.Store, cache *nws.Cache, outageCache *outages.Cache) {
	r.Get("/storm-packages/export", stormPackageExportHandler(st, cache, outageCache))
}

func stormPackageExportHandler(st *store.Store, cache *nws.Cache, outageCache *outages.Cache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		scope := r.URL.Query().Get("scope")
		if scope == "" {
			scope = "maine"
		}
		limit := 100
		if v := r.URL.Query().Get("limit"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 500 {
				limit = n
			}
		}

		pkg := map[string]any{
			"generatedAt": time.Now().UTC().Format(time.RFC3339),
			"scope":       scope,
			"sourceNote":  "Storm package composed from TrackerIncident archive + live overview. Not a forecast product.",
			"label":       "Saints Weather Watch storm package",
		}

		if cache != nil {
			live := cache.Get()
			liveMap := map[string]any{
				"generatedAt": live.GeneratedAt,
				"alertCount":  len(live.Alerts),
				"topHeadline": "",
			}
			if len(live.Alerts) > 0 {
				liveMap["topHeadline"] = live.Alerts[0].Headline
			}
			pkg["live"] = liveMap
		}

		if outageCache != nil {
			o := outageCache.Get()
			pkg["outage"] = map[string]any{
				"maineMetersOut":   o.MaineMetersOut,
				"maineCountiesOut": o.MaineCountiesOut,
				"maineCovered":     o.MaineCovered,
				"source":           o.Source,
				"generatedAt":      o.GeneratedAt,
			}
		}

		incidents := []any{}
		if st != nil {
			var filters []db.TrackerIncidentWhereParam
			if scope == "national" {
				filters = append(filters, db.TrackerIncident.Or(
					db.TrackerIncident.Scope.Equals("usa"),
					db.TrackerIncident.Scope.Equals("canada"),
				))
			} else if scope != "all" {
				filters = append(filters, db.TrackerIncident.Scope.Equals(scope))
			}
			if days := r.URL.Query().Get("days"); days != "" {
				if n, err := strconv.Atoi(days); err == nil && n > 0 && n <= 365 {
					cutoff := time.Now().UTC().AddDate(0, 0, -n)
					filters = append(filters, db.TrackerIncident.DatePulled.Gte(cutoff))
				}
			}
			rows, err := st.Client.TrackerIncident.FindMany(filters...).OrderBy(
				db.TrackerIncident.DatePulled.Order(db.SortOrderDesc),
			).Take(limit).Exec(r.Context())
			if err == nil {
				for _, row := range rows {
					incidents = append(incidents, row)
				}
			}
		}
		pkg["incidents"] = incidents
		pkg["incidentCount"] = len(incidents)

		filename := "storm-package-" + strings.ReplaceAll(scope, " ", "-") + "-" + time.Now().UTC().Format("20060102") + ".json"
		w.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)
		_ = json.NewEncoder(w).Encode(pkg)
	}
}

func defaultPrefsPayload() map[string]any {
	return map[string]any{
		"cardOrder":   "profile,progress,garage,loot,cams,areas,map",
		"hiddenCards": "",
		"mapLayers":   ops.DefaultLayerCSV,
	}
}
