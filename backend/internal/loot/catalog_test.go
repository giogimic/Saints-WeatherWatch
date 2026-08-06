package loot

import "testing"

func TestLookupAndWeights(t *testing.T) {
	if _, ok := Lookup("radar_core"); !ok {
		t.Fatal("expected radar_core")
	}
	if _, ok := Lookup("nope"); ok {
		t.Fatal("unknown should miss")
	}
	w := WeightedKeys()
	if len(w) < len(Catalog) {
		t.Fatalf("weights too short: %d", len(w))
	}
}
