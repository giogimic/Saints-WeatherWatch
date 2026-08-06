package world

import "testing"

func TestZoneAtCityPresqueIsle(t *testing.T) {
	if z := ZoneAt(46.68, -68.02); z != ZoneCity {
		t.Fatalf("want city, got %s", z)
	}
}

func TestZoneAtCoastEast(t *testing.T) {
	if z := ZoneAt(44.9, -67.0); z != ZoneCoast {
		t.Fatalf("want coast, got %s", z)
	}
}

func TestZoneAtFarmBelt(t *testing.T) {
	if z := ZoneAt(46.5, -68.2); z != ZoneFarm {
		t.Fatalf("want farm, got %s", z)
	}
}

func TestZoneAtForestDefault(t *testing.T) {
	if z := ZoneAt(45.5, -70.5); z != ZoneForest {
		t.Fatalf("want forest, got %s", z)
	}
}

func TestNormalizeLobbyID(t *testing.T) {
	if NormalizeLobbyID("") != "main" {
		t.Fatal("empty → main")
	}
	if NormalizeLobbyID(" Alpha ") != "alpha" {
		t.Fatal("trim/lower")
	}
	if NormalizeLobbyID("!!!") != "main" {
		t.Fatal("junk → main")
	}
	if NormalizeLobbyID("bad!!") != "bad" {
		t.Fatal("strip punctuation keep letters")
	}
}
