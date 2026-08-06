package outages

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

// Cache polls ODIN and holds the latest Snapshot.
type Cache struct {
	client *Client
	store  *store.Store

	mu     sync.RWMutex
	snap   Snapshot
	err    string
	lastOK time.Time
}

func NewCache(userAgent string, st *store.Store) *Cache {
	return &Cache{
		client: NewClient(userAgent),
		store:  st,
		snap: Snapshot{
			Source:     "ODIN (ORNL) public API",
			SourceNote: "Waiting for first poll…",
			Maine:      []CountyOutage{},
			Nearby:     []CountyOutage{},
			States:     []StateOutage{},
			UtilityLinks: []UtilityLink{
				{Name: "Versant Power outage map", URL: "https://www.versantpower.com/outages-restoration/live-outage-map/current-outage-alerts", Blurb: "Northern & eastern Maine"},
				{Name: "CMP outages", URL: "https://www.cmpco.com/outages", Blurb: "Central & southern Maine"},
			},
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
		stale = time.Duration(age)*time.Second > 20*time.Minute
		out.FetchedAt = c.lastOK.UTC().Format(time.RFC3339)
	}
	if c.err != "" {
		stale = true
	}
	out.AgeSec = age
	out.StaleAfterSec = int((20 * time.Minute).Seconds())
	out.Stale = stale
	out.LastError = c.err
	out.PolicyNote = "Official ODIN county estimates only. No address-level scraping; Maine CMP/Versant may be uncovered."
	return out
}

func (c *Cache) LastError() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.err
}

// Start polls ODIN on an interval until ctx is done.
func (c *Cache) Start(ctx context.Context, every time.Duration) {
	if every < 2*time.Minute {
		every = 5 * time.Minute
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
	prev := c.snap.MaineMetersOut
	if err != nil {
		c.err = err.Error()
		log.Printf("outages: refresh failed: %v", err)
		c.mu.Unlock()
		return
	}
	c.snap = snap
	c.err = ""
	c.lastOK = time.Now()
	c.mu.Unlock()

	c.maybePersist(prev, snap)
}

func (c *Cache) maybePersist(prevMeters int, snap Snapshot) {
	if c.store == nil {
		return
	}
	// Record when Maine total changes, or first non-zero national sample hourly-ish.
	changed := snap.MaineMetersOut != prevMeters
	if !changed && snap.MaineMetersOut == 0 && snap.NationalMetersOut == 0 {
		return
	}
	if !changed {
		// Still snapshot national spike samples at most every ~55 min via crude check in DB.
		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		defer cancel()
		recent, err := c.store.Client.OutageSnapshot.FindMany(
			db.OutageSnapshot.Scope.Equals("maine"),
		).OrderBy(db.OutageSnapshot.SampledAt.Order(db.SortOrderDesc)).Take(1).Exec(ctx)
		if err == nil && len(recent) > 0 && time.Since(recent[0].SampledAt) < 55*time.Minute {
			return
		}
	}

	summary, _ := json.Marshal(map[string]any{
		"maineMetersOut":   snap.MaineMetersOut,
		"maineCountiesOut": snap.MaineCountiesOut,
		"nationalMetersOut": snap.NationalMetersOut,
		"maineCovered":     snap.MaineCovered,
		"topMaine":         topCounties(snap.Maine, 5),
	})
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	_, err := c.store.Client.OutageSnapshot.CreateOne(
		db.OutageSnapshot.Scope.Set("maine"),
		db.OutageSnapshot.MetersOut.Set(snap.MaineMetersOut),
		db.OutageSnapshot.CountiesOut.Set(snap.MaineCountiesOut),
		db.OutageSnapshot.NationalOut.Set(snap.NationalMetersOut),
		db.OutageSnapshot.SummaryJSON.Set(string(summary)),
		db.OutageSnapshot.Source.Set(snap.Source),
	).Exec(ctx)
	if err != nil {
		log.Printf("outages: persist snapshot: %v", err)
	}
}

func topCounties(list []CountyOutage, n int) []map[string]any {
	out := make([]map[string]any, 0, n)
	for _, c := range list {
		if c.MetersOut <= 0 {
			continue
		}
		out = append(out, map[string]any{"fips": c.FIPS, "name": c.Name, "metersOut": c.MetersOut})
		if len(out) >= n {
			break
		}
	}
	return out
}

// CorrelateArea returns outage + note for a watched lat/lon in Maine.
func (c *Cache) CorrelateArea(lat, lng float64) map[string]any {
	snap := c.Get()
	fips, name := CountyForPoint(lat, lng)
	meters := 0
	utils := []string{}
	for _, ct := range snap.Maine {
		if ct.FIPS == fips {
			meters = ct.MetersOut
			utils = ct.Utilities
			break
		}
	}
	return map[string]any{
		"fips":           fips,
		"county":         name,
		"metersOut":      meters,
		"utilities":      utils,
		"maineCovered":   snap.MaineCovered,
		"maineMetersOut": snap.MaineMetersOut,
		"source":         snap.Source,
		"generatedAt":    snap.GeneratedAt,
		"utilityLinks":   snap.UtilityLinks,
	}
}
