package world

import (
	"testing"

	"github.com/saints-weatherwatch/backend/internal/nws"
)

func TestNearestMatchingAlert(t *testing.T) {
	lat, lon := 47.05, -68.35
	farLat, farLon := 40.0, -90.0
	near := nws.Alert{
		ID: "a1", Headline: "Near", Severity: "Moderate",
		CentroidLat: &lat, CentroidLon: &lon,
	}
	far := nws.Alert{
		ID: "a2", Headline: "Far", Severity: "Severe",
		CentroidLat: &farLat, CentroidLon: &farLon,
	}
	got, _ := nearestMatchingAlert(47.1, -68.4, []nws.Alert{far, near})
	if got == nil || got.ID != "a1" {
		t.Fatalf("want near alert, got %+v", got)
	}
}

func TestNearestMatchingAlertNone(t *testing.T) {
	farLat, farLon := 40.0, -90.0
	far := nws.Alert{
		ID: "a2", Headline: "Far",
		CentroidLat: &farLat, CentroidLon: &farLon,
	}
	got, _ := nearestMatchingAlert(47.05, -68.35, []nws.Alert{far})
	if got != nil {
		t.Fatalf("expected nil, got %+v", got)
	}
}

func TestActionableAlertsSkipsExpired(t *testing.T) {
	lat, lon := 47.0, -68.0
	in := []nws.Alert{
		{ID: "x", Status: "expired", CentroidLat: &lat, CentroidLon: &lon},
		{ID: "y", Status: "active", CentroidLat: &lat, CentroidLon: &lon},
	}
	out := actionableAlerts(in)
	if len(out) != 1 || out[0].ID != "y" {
		t.Fatalf("got %+v", out)
	}
}
