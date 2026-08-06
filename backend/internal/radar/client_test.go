package radar

import (
	"testing"
	"time"
)

func TestParseWorldfileCBW(t *testing.T) {
	raw := "0.011940\n0.0\n0.0\n-0.011940\n-73.776020\n52.009020\n"
	box, err := parseWorldfile(raw, 1000, 1000)
	if err != nil {
		t.Fatal(err)
	}
	if box.West < -73.78 || box.West > -73.77 {
		t.Fatalf("west=%v", box.West)
	}
	if box.North < 52.0 || box.North > 52.02 {
		t.Fatalf("north=%v", box.North)
	}
	if box.East < -61.84 || box.East > -61.83 {
		t.Fatalf("east=%v", box.East)
	}
	if box.South < 40.06 || box.South > 40.08 {
		t.Fatalf("south=%v", box.South)
	}
}

func TestArchiveRidgeURL(t *testing.T) {
	ts := time.Date(2026, 8, 6, 4, 29, 0, 0, time.UTC)
	u := ArchiveRidgeURL("CBW", "N0S", ts)
	want := "https://mesonet.agron.iastate.edu/archive/data/2026/08/06/GIS/ridge/CBW/N0S/CBW_N0S_202608060429.png"
	if u != want {
		t.Fatalf("got %s", u)
	}
}

func TestParseIEMScanTS(t *testing.T) {
	tm, ok := parseIEMScanTS("2026-08-06T04:29Z")
	if !ok || tm.Minute() != 29 {
		t.Fatalf("got %v ok=%v", tm, ok)
	}
}

func TestHaversineCBW(t *testing.T) {
	// St. John Valley → Caribou NEXRAD should be under ~150 km
	d := haversineKm(47.05, -68.35, 46.039, -67.806)
	if d < 80 || d > 150 {
		t.Fatalf("distance %.1f km unexpected", d)
	}
}

func TestDefaultProducts(t *testing.T) {
	ps := defaultProducts()
	if len(ps) < 3 {
		t.Fatal("expected reflectivity + HD + velocity")
	}
	ids := map[string]bool{}
	for _, p := range ps {
		ids[p.ID] = true
	}
	for _, id := range []string{"n0r", "n0q", "n0s"} {
		if !ids[id] {
			t.Fatalf("missing product %s", id)
		}
	}
}

func TestFetchStatusLive(t *testing.T) {
	if testing.Short() {
		t.Skip("live network")
	}
	c := NewClient("SaintsWeatherWatch-test/1.0")
	st, err := c.FetchStatus(DefaultFocus.Lat, DefaultFocus.Lon)
	if err != nil {
		t.Fatal(err)
	}
	if st.Nearest == nil || st.Nearest.ID != "CBW" {
		t.Fatalf("expected CBW nearest, got %+v", st.Nearest)
	}
	if len(st.Products) < 3 {
		t.Fatal("products")
	}
	scans, err := c.FetchScans("USCOMP", "N0Q", 1)
	if err != nil {
		t.Fatal(err)
	}
	if len(scans.Scans) == 0 {
		t.Fatal("expected scan frames")
	}
	t.Logf("nearest=%s age=%v scans=%d", st.Nearest.ID, st.LatestScan, len(scans.Scans))
}
