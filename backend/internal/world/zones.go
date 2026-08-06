package world

import (
	"math"
	mrand "math/rand"
)

// ZoneKind is a coarse land-cover class for the Maine corridor.
// Hand-authored approximations — not real GIS land-cover tiles (yet).
type ZoneKind string

const (
	ZoneForest ZoneKind = "forest"
	ZoneCoast  ZoneKind = "coast"
	ZoneCity   ZoneKind = "city"
	ZoneFarm   ZoneKind = "farm"
)

// ZoneInfo is exposed on the catalog / lobbies APIs for HUD copy.
type ZoneInfo struct {
	ID    ZoneKind `json:"id"`
	Name  string   `json:"name"`
	Blurb string   `json:"blurb"`
}

var ZoneCatalog = []ZoneInfo{
	{ID: ZoneForest, Name: "Forest", Blurb: "Woods & highlands — scrap, notes, rare fragments."},
	{ID: ZoneCoast, Name: "Coast", Blurb: "Downeast / Fundy fringe — batteries, metals, solar."},
	{ID: ZoneCity, Name: "Town", Blurb: "Bangor · Presque Isle · Caribou · Houlton cores — electronics."},
	{ID: ZoneFarm, Name: "Farm", Blurb: "Aroostook farm country — fuel, tires, roadside scrap."},
}

// Approximate Maine corridor land cover (Phase 3 — match-ish, not satellite).
// Priority: city pockets → coast strip → farm belt → forest default.
func ZoneAt(lat, lng float64) ZoneKind {
	if inCity(lat, lng) {
		return ZoneCity
	}
	// Downeast / eastern coastal fringe within corridor bounds.
	if lng >= -67.45 && lat <= 45.85 {
		return ZoneCoast
	}
	if lng >= -67.15 {
		return ZoneCoast
	}
	// Aroostook potato / farm belt (exclude far western highlands).
	if lat >= 46.15 && lat <= 47.15 && lng >= -68.85 && lng <= -67.55 {
		return ZoneFarm
	}
	return ZoneForest
}

func inCity(lat, lng float64) bool {
	for _, c := range cityCores {
		if math.Hypot(lat-c.lat, lng-c.lng) <= c.r {
			return true
		}
	}
	return false
}

var cityCores = []struct {
	lat, lng, r float64
}{
	{44.80, -68.77, 0.12}, // Bangor
	{46.68, -68.02, 0.08}, // Presque Isle
	{46.86, -68.01, 0.07}, // Caribou
	{46.13, -67.84, 0.07}, // Houlton
	{47.25, -68.59, 0.06}, // Fort Kent / St. John pocket
}

// zoneWeights: material keys, repeated for rarity bias inside each zone.
var zoneWeights map[ZoneKind][]string

func ensureZoneWeights() {
	if zoneWeights != nil {
		return
	}
	zoneWeights = map[ZoneKind][]string{
		ZoneForest: expandZoneWeights([]zoneWeight{
			{"scrap_metal", 5}, {"wiring", 4}, {"plastic_parts", 3}, {"copper", 2},
			{"scientific_note", 4}, {"weather_journal", 2}, {"blueprint_frag", 1},
			{"aluminum", 2}, {"battery", 2},
		}),
		ZoneCoast: expandZoneWeights([]zoneWeight{
			{"battery", 5}, {"copper", 4}, {"aluminum", 4}, {"solar_cell", 3},
			{"fuel_can", 2}, {"wiring", 3}, {"scrap_metal", 2}, {"electronics", 1},
		}),
		ZoneCity: expandZoneWeights([]zoneWeight{
			{"electronics", 5}, {"camera_parts", 3}, {"radio_parts", 3}, {"gps_module", 2},
			{"battery", 4}, {"wiring", 3}, {"plastic_parts", 2}, {"advanced_sensor", 1},
		}),
		ZoneFarm: expandZoneWeights([]zoneWeight{
			{"scrap_metal", 5}, {"fuel_can", 4}, {"spare_tire", 3}, {"plastic_parts", 3},
			{"battery", 3}, {"aluminum", 2}, {"wiring", 2}, {"weather_journal", 1},
		}),
	}
}

type zoneWeight struct {
	key string
	n   int
}

func expandZoneWeights(rows []zoneWeight) []string {
	out := make([]string, 0, 32)
	for _, row := range rows {
		if itemByKey != nil {
			if _, ok := itemByKey[row.key]; !ok {
				continue
			}
		}
		for i := 0; i < row.n; i++ {
			out = append(out, row.key)
		}
	}
	return out
}

// PickDropForPoint chooses a material biased by approximate land cover at lat/lng.
// Falls back to the global dropWeights table if a zone table is empty.
func PickDropForPoint(lat, lng float64) (key string, zone ZoneKind) {
	ensureZoneWeights()
	zone = ZoneAt(lat, lng)
	w := zoneWeights[zone]
	if len(w) == 0 {
		if len(dropWeights) == 0 {
			return "scrap_metal", zone
		}
		return dropWeights[mrand.Intn(len(dropWeights))], zone
	}
	return w[mrand.Intn(len(w))], zone
}
