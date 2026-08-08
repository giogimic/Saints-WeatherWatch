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
	{ID: "st-john", Label: "St. John Valley (Maine)", Lat: 47.25, Lon: -68.55, RadiusKM: 55},
	{ID: "caribou", Label: "Caribou / Aroostook (Maine)", Lat: 46.86, Lon: -68.01, RadiusKM: 50},
	{ID: "i95-north", Label: "I-95 North (Maine)", Lat: 46.15, Lon: -67.85, RadiusKM: 65},
	{ID: "quebec-border", Label: "Québec Border & Bas-Saint-Laurent", Lat: 47.6, Lon: -68.9, RadiusKM: 120},
	{ID: "nb-route2", Label: "New Brunswick Corridor", Lat: 46.9, Lon: -66.6, RadiusKM: 220},
	{ID: "nova-scotia", Label: "Nova Scotia Coastal Corridor", Lat: 44.6, Lon: -63.6, RadiusKM: 300},
	{ID: "pei", Label: "Prince Edward Island", Lat: 46.25, Lon: -63.7, RadiusKM: 200},
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
