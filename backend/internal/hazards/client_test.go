package hazards

import "testing"

func TestSeverityFromNWPSThresholds(t *testing.T) {
	g := nwpsGauge{}
	g.Flood.Categories.Action = &nwpsCat{Stage: 18}
	g.Flood.Categories.Minor = &nwpsCat{Stage: 22.5}
	g.Flood.Categories.Moderate = &nwpsCat{Stage: 24.5}
	g.Flood.Categories.Major = &nwpsCat{Stage: 26.5}

	if severityFromNWPS("no_flooding", 4.5, g) != "info" {
		t.Fatal("expected info below action")
	}
	if severityFromNWPS("", 19, g) != "action" {
		t.Fatal("expected action")
	}
	if severityFromNWPS("", 23, g) != "minor" {
		t.Fatal("expected minor")
	}
	if severityFromNWPS("major", 30, g) != "major" {
		t.Fatal("expected major from category")
	}
}

func TestCorridorGaugesPresent(t *testing.T) {
	if len(corridorGauges) < 6 {
		t.Fatal("expected corridor gauge set")
	}
	seen := map[string]bool{}
	for _, g := range corridorGauges {
		seen[g.LID] = true
	}
	for _, id := range []string{"DICM1", "FTKM1", "WSHM1"} {
		if !seen[id] {
			t.Fatalf("missing %s", id)
		}
	}
}

func TestFetchSnapshotLive(t *testing.T) {
	if testing.Short() {
		t.Skip("live network")
	}
	c := NewClient("SaintsWeatherWatch-test/1.0")
	snap, err := c.FetchSnapshot()
	if err != nil {
		t.Fatal(err)
	}
	if snap.FloodGaugeCount == 0 {
		t.Fatal("expected flood gauges")
	}
	t.Logf("flood=%d actionable=%d quakes=%d note=%s",
		snap.FloodGaugeCount, snap.FloodActionable, snap.QuakeCount, snap.SourceNote)
}

func TestGeoJSONKinds(t *testing.T) {
	cache := NewCache("test")
	cache.mu.Lock()
	cache.snap = Snapshot{
		Flood: []Incident{{ID: "flood-x", Kind: "flood", Lat: 47, Lon: -68, Headline: "x"}},
		Quakes: []Incident{{ID: "quake-y", Kind: "quake", Lat: 46, Lon: -69, Headline: "y"}},
		Incidents: []Incident{
			{ID: "flood-x", Kind: "flood", Lat: 47, Lon: -68},
			{ID: "quake-y", Kind: "quake", Lat: 46, Lon: -69},
		},
	}
	cache.mu.Unlock()
	fc := cache.GeoJSON("flood")
	feats, _ := fc["features"].([]any)
	if len(feats) != 1 {
		t.Fatalf("flood features=%d", len(feats))
	}
	near := cache.CorrelateArea(47.05, -68.35, 100)
	if near["quakeCount"].(int) < 0 {
		t.Fatal("bad correlate")
	}
}
