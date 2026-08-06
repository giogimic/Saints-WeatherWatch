package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/saints-weatherwatch/backend/internal/ops"
)

func policyHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"generatedAt":     time.Now().UTC().Format(time.RFC3339),
			"policyNote":      ops.PolicyNote,
			"attribution":     ops.AttributionLine,
			"resolution":      "county/municipality max for outages unless licensed",
			"sources": []string{
				"NWS api.weather.gov",
				"ODIN (ORNL) public county outages",
				"Iowa State IEM NEXRAD / RIDGE",
				"NOAA NWPS / AHPS gauges",
				"USGS Earthquake Hazards",
				"OpenCCTV / FAA / NOAA GOES cams",
			},
			"rateLimitNote": "Public GET endpoints are soft-limited per IP; see X-RateLimit-* headers. Back off on 429.",
			"staleNote":     "Overview and feed payloads include freshness.stale when last-good data is older than threshold.",
		})
	}
}
