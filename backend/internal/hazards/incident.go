package hazards

// Incident is the shared live multi-hazard model (Phase D).
// Not persisted to TrackerIncident (weather archive stays separate).
type Incident struct {
	ID         string         `json:"id"`
	Kind       string         `json:"kind"` // flood | quake | fire | smoke
	Source     string         `json:"source"`
	SourceURL  string         `json:"sourceUrl,omitempty"`
	Headline   string         `json:"headline"`
	Status     string         `json:"status,omitempty"`
	Severity   string         `json:"severity,omitempty"` // info | action | minor | moderate | major | unknown
	Lat        float64        `json:"lat"`
	Lon        float64        `json:"lon"`
	Area       string         `json:"area,omitempty"`
	ObservedAt string         `json:"observedAt,omitempty"`
	Meta       map[string]any `json:"meta,omitempty"`
}

// Snapshot is the cached multi-hazard desk payload.
type Snapshot struct {
	GeneratedAt     string     `json:"generatedAt"`
	SourceNote      string     `json:"sourceNote"`
	FloodActionable int        `json:"floodActionable"`
	FloodGaugeCount int        `json:"floodGaugeCount"`
	QuakeCount      int        `json:"quakeCount"`
	FireCount       int        `json:"fireCount"`
	Incidents       []Incident `json:"incidents"`
	Flood           []Incident `json:"flood"`
	Quakes          []Incident `json:"quakes"`
	Fire            []Incident `json:"fire"`
	// Phase F freshness
	FetchedAt     string `json:"fetchedAt,omitempty"`
	AgeSec        int    `json:"ageSec,omitempty"`
	StaleAfterSec int    `json:"staleAfterSec,omitempty"`
	Stale         bool   `json:"stale,omitempty"`
	LastError     string `json:"lastError,omitempty"`
}

// Corridor focus — Northern Maine / St. John Valley.
const (
	FocusLat = 47.05
	FocusLon = -68.35
)

// Quake bbox (ME + near NB / NH / QC edge).
const (
	quakeMinLat = 43.5
	quakeMaxLat = 48.5
	quakeMinLon = -71.5
	quakeMaxLon = -66.5
	quakeMinMag = 2.5
)

type nwpsGaugeRef struct {
	LID    string
	USGSID string
	Label  string // optional override
}
