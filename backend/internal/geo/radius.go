package geo

import "math"

const earthRadiusMiles = 3958.8

func HaversineMiles(lat1, lon1, lat2, lon2 float64) float64 {
	toRad := math.Pi / 180
	dLat := (lat2 - lat1) * toRad
	dLon := (lon2 - lon1) * toRad
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*toRad)*math.Cos(lat2*toRad)*math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadiusMiles * c
}

// CircleIntersectsCoords returns true if any coordinate is within radiusMiles of center.
func CircleIntersectsCoords(centerLat, centerLon, radiusMiles float64, coords [][2]float64) bool {
	for _, c := range coords {
		if HaversineMiles(centerLat, centerLon, c[1], c[0]) <= radiusMiles {
			return true
		}
	}
	return false
}

func FlattenCoords(node interface{}) [][2]float64 {
	arr, ok := node.([]interface{})
	if !ok || len(arr) == 0 {
		return nil
	}
	if len(arr) >= 2 {
		lon, ok1 := asFloat(arr[0])
		lat, ok2 := asFloat(arr[1])
		if ok1 && ok2 {
			if _, nested := arr[0].([]interface{}); !nested {
				return [][2]float64{{lon, lat}}
			}
		}
	}
	out := make([][2]float64, 0, 32)
	for _, child := range arr {
		out = append(out, FlattenCoords(child)...)
	}
	return out
}

func asFloat(v interface{}) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case int:
		return float64(n), true
	default:
		return 0, false
	}
}

func AlertMatchesRadius(centerLat, centerLon float64, radiusMiles float64, centroidLat, centroidLon *float64, geometry interface{}) (match bool, approximate bool) {
	if geometry != nil {
		if m, ok := geometry.(map[string]interface{}); ok {
			coords := FlattenCoords(m["coordinates"])
			if len(coords) > 0 && CircleIntersectsCoords(centerLat, centerLon, radiusMiles, coords) {
				return true, false
			}
		}
	}
	if centroidLat != nil && centroidLon != nil {
		if HaversineMiles(centerLat, centerLon, *centroidLat, *centroidLon) <= radiusMiles {
			return true, true
		}
	}
	return false, false
}
