package geo

import "testing"

func TestHaversineNearby(t *testing.T) {
	// Fort Kent-ish to nearby point
	d := HaversineMiles(47.25, -68.59, 47.30, -68.59)
	if d < 2 || d > 5 {
		t.Fatalf("unexpected distance %.2f", d)
	}
}

func TestAlertMatchesRadiusCentroid(t *testing.T) {
	lat, lon := 47.05, -68.35
	ok, approx := AlertMatchesRadius(47.05, -68.35, 50, &lat, &lon, nil)
	if !ok || !approx {
		t.Fatal("centroid within radius should match approximately")
	}
}
