package outages

import "testing"

func TestNormalizeFIPS(t *testing.T) {
	if normalizeFIPS("23003") != "23003" {
		t.Fatal("passthrough")
	}
	if normalizeFIPS("3003") != "03003" {
		t.Fatal("pad")
	}
	if normalizeFIPS("abc") != "" {
		t.Fatal("junk")
	}
}

func TestCountyForPointAroostook(t *testing.T) {
	fips, name := CountyForPoint(47.05, -68.35)
	if fips != "23003" || name != "Aroostook" {
		t.Fatalf("got %s %s", fips, name)
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
	if len(snap.Maine) != 16 {
		t.Fatalf("want 16 ME counties, got %d", len(snap.Maine))
	}
	if snap.Source == "" {
		t.Fatal("missing source")
	}
	t.Logf("ME meters=%d covered=%v national=%d reporters=%d nearby=%d",
		snap.MaineMetersOut, snap.MaineCovered, snap.NationalMetersOut, snap.UtilityReporters, len(snap.Nearby))
}
