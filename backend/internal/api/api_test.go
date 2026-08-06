package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/saints-weatherwatch/backend/internal/cams"
	"github.com/saints-weatherwatch/backend/internal/nws"
)

func mockCache() *nws.Cache {
	c := nws.NewCache(nil)
	now := time.Now().UTC()
	c.Set(nws.AlertsResponse{
		GeneratedAt: now.Format(time.RFC3339),
		Alerts: []nws.Alert{
			{
				ID:            "nws-001",
				Severity:      "Extreme",
				Area:          "Central Plains",
				Headline:      "Tornado Warning",
				Status:        "active",
				StartsAt:      now.Add(-8 * time.Minute).Format(time.RFC3339),
				EndsAt:        now.Add(22 * time.Minute).Format(time.RFC3339),
				Category:      "tornado",
				Why:           "A strong rotating storm is present",
				LocationIndex: "Zone A: close to the storm core",
				Cause:         "Wind shear and warm, unstable air",
				WhatToDo:      "Take shelter",
			},
		},
		History: []nws.HistoryLog{
			{ID: "hist-001", Category: "tornado", Headline: "Tornado Warning", LastSeen: now.Format(time.RFC3339), Count: 1},
		},
	})
	return c
}

func TestAlertsEndpointReturnsStructuredPayload(t *testing.T) {
	r := chi.NewRouter()
	cache := mockCache()
	Mount(r, nil, cache, cams.NewCache(), nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/alerts", nil)
	rr := httptest.NewRecorder()

	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", rr.Code, rr.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid json, got error: %v", err)
	}

	if _, ok := payload["alerts"]; !ok {
		t.Fatalf("expected alerts payload, got: %v", payload)
	}

	if _, ok := payload["history"]; !ok {
		t.Fatalf("expected history payload, got: %v", payload)
	}

	alerts, ok := payload["alerts"].([]any)
	if !ok || len(alerts) == 0 {
		t.Fatalf("expected non-empty alerts array, got: %v", payload["alerts"])
	}

	firstAlert, ok := alerts[0].(map[string]any)
	if !ok {
		t.Fatalf("expected alert objects, got: %v", alerts[0])
	}

	for _, key := range []string{"category", "why", "locationIndex", "cause", "whatToDo"} {
		if _, ok := firstAlert[key]; !ok {
			t.Fatalf("expected alert to include %s, got: %v", key, firstAlert)
		}
	}
}

func TestOverviewEndpointReturnsSummary(t *testing.T) {
	r := chi.NewRouter()
	cache := mockCache()
	Mount(r, nil, cache, cams.NewCache(), nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/overview", nil)
	rr := httptest.NewRecorder()

	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d with body %s", rr.Code, rr.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &payload); err != nil {
		t.Fatalf("expected valid json, got error: %v", err)
	}

	for _, key := range []string{"generatedAt", "totalAlerts", "severeAlerts", "watchCount", "categories"} {
		if _, ok := payload[key]; !ok {
			t.Fatalf("expected overview to include %s, got: %v", key, payload)
		}
	}
}
