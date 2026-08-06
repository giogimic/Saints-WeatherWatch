package hazards

import (
	"context"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/saints-weatherwatch/backend/internal/geo"
)

// Cache polls NWPS + USGS and holds the latest Snapshot.
type Cache struct {
	client *Client

	mu     sync.RWMutex
	snap   Snapshot
	err    string
	lastOK time.Time
}

func NewCache(userAgent string) *Cache {
	return &Cache{
		client: NewClient(userAgent),
		snap: Snapshot{
			SourceNote: "Waiting for first multi-hazard poll…",
			Incidents:  []Incident{},
			Flood:      []Incident{},
			Quakes:     []Incident{},
			Fire:       []Incident{},
		},
	}
}

func (c *Cache) Get() Snapshot {
	c.mu.RLock()
	defer c.mu.RUnlock()
	out := c.snap
	age := 0
	stale := c.lastOK.IsZero()
	if !c.lastOK.IsZero() {
		age = int(time.Since(c.lastOK).Seconds())
		if age < 0 {
			age = 0
		}
		stale = time.Duration(age)*time.Second > 30*time.Minute
		out.FetchedAt = c.lastOK.UTC().Format(time.RFC3339)
	}
	if c.err != "" {
		stale = true
	}
	out.AgeSec = age
	out.StaleAfterSec = int((30 * time.Minute).Seconds())
	out.Stale = stale
	out.LastError = c.err
	return out
}

func (c *Cache) LastError() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.err
}

func (c *Cache) Start(ctx context.Context, every time.Duration) {
	if every < 2*time.Minute {
		every = 10 * time.Minute
	}
	c.refresh()
	t := time.NewTicker(every)
	go func() {
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				c.refresh()
			}
		}
	}()
}

func (c *Cache) refresh() {
	snap, err := c.client.FetchSnapshot()
	c.mu.Lock()
	defer c.mu.Unlock()
	if err != nil {
		c.err = err.Error()
		log.Printf("hazards: refresh failed: %v", err)
		return
	}
	c.snap = *snap
	c.err = ""
	c.lastOK = time.Now()
	log.Printf("hazards: flood=%d actionable=%d quakes=%d",
		snap.FloodGaugeCount, snap.FloodActionable, snap.QuakeCount)
}

// CorrelateArea returns flood gauges + quakes near a lat/lon.
func (c *Cache) CorrelateArea(lat, lon, radiusMiles float64) map[string]any {
	if radiusMiles <= 0 {
		radiusMiles = 50
	}
	snap := c.Get()
	flood := filterNear(snap.Flood, lat, lon, radiusMiles)
	quakes := filterNear(snap.Quakes, lat, lon, radiusMiles)
	actionable := 0
	for _, f := range flood {
		if f.Severity != "" && f.Severity != "info" && f.Severity != "unknown" {
			actionable++
		}
	}
	return map[string]any{
		"flood":           flood,
		"quakes":          quakes,
		"floodActionable": actionable,
		"quakeCount":      len(quakes),
		"radiusMiles":     radiusMiles,
	}
}

func filterNear(list []Incident, lat, lon, radiusMiles float64) []Incident {
	out := make([]Incident, 0)
	for _, inc := range list {
		if inc.Lat == 0 && inc.Lon == 0 {
			continue
		}
		if geo.HaversineMiles(lat, lon, inc.Lat, inc.Lon) <= radiusMiles {
			out = append(out, inc)
		}
	}
	return out
}

// GeoJSON returns a FeatureCollection for map overlays.
func (c *Cache) GeoJSON(kind string) map[string]any {
	snap := c.Get()
	var list []Incident
	switch strings.ToLower(kind) {
	case "flood":
		list = snap.Flood
	case "quake", "quakes":
		list = snap.Quakes
	case "fire":
		list = snap.Fire
	default:
		list = snap.Incidents
	}
	features := make([]any, 0, len(list))
	for _, inc := range list {
		props := map[string]any{
			"id":         inc.ID,
			"kind":       inc.Kind,
			"headline":   inc.Headline,
			"severity":   inc.Severity,
			"status":     inc.Status,
			"source":     inc.Source,
			"sourceUrl":  inc.SourceURL,
			"area":       inc.Area,
			"observedAt": inc.ObservedAt,
		}
		for k, v := range inc.Meta {
			props[k] = v
		}
		features = append(features, map[string]any{
			"type": "Feature",
			"geometry": map[string]any{
				"type":        "Point",
				"coordinates": []float64{inc.Lon, inc.Lat},
			},
			"properties": props,
		})
	}
	return map[string]any{
		"type":     "FeatureCollection",
		"features": features,
	}
}
