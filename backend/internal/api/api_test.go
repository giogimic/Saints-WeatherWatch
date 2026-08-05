package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
)

func TestAlertsEndpointReturnsStructuredPayload(t *testing.T) {
	r := chi.NewRouter()
	Mount(r, nil)

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
	Mount(r, nil)

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
