package cams

// Corridor is a named geographic bucket for road/field cams.
type Corridor struct {
	ID       string  `json:"id"`
	Label    string  `json:"label"`
	Lat      float64 `json:"lat"`
	Lon      float64 `json:"lon"`
	RadiusKM float64 `json:"radiusKm"`
}

// Corridors covers the northern Maine / St. John Valley ops focus.
var Corridors = []Corridor{
	{ID: "st-john", Label: "St. John Valley", Lat: 47.25, Lon: -68.55, RadiusKM: 55},
	{ID: "caribou", Label: "Caribou / Aroostook", Lat: 46.86, Lon: -68.01, RadiusKM: 50},
	{ID: "i95-north", Label: "I-95 North", Lat: 46.15, Lon: -67.85, RadiusKM: 65},
	{ID: "nb-border", Label: "NB border / Route 2", Lat: 47.0, Lon: -67.65, RadiusKM: 55},
}

const outerCorridorID = "outer"
const outerCorridorLabel = "Outer corridor"

// AssignCorridor returns the nearest corridor within its radius, else outer.
func AssignCorridor(lat, lng float64) (id, label string) {
	if lat == 0 && lng == 0 {
		return "", ""
	}
	pt := LatLng{Lat: lat, Lng: lng}
	bestID := outerCorridorID
	bestLabel := outerCorridorLabel
	bestDist := 1e9
	inAny := false
	for _, c := range Corridors {
		d := haversineKM(pt, LatLng{Lat: c.Lat, Lng: c.Lon})
		if d <= c.RadiusKM && d < bestDist {
			bestDist = d
			bestID = c.ID
			bestLabel = c.Label
			inAny = true
		}
	}
	if !inAny {
		// Still tag nearest corridor name as outer context when far.
		for _, c := range Corridors {
			d := haversineKM(pt, LatLng{Lat: c.Lat, Lng: c.Lon})
			if d < bestDist {
				bestDist = d
			}
		}
		return outerCorridorID, outerCorridorLabel
	}
	return bestID, bestLabel
}
