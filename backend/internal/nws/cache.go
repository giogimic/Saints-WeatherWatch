package nws

import (
	"context"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

// UpdateHook is called after a successful live poll with the full snapshot and
// any alerts that were not present in the previous snapshot (for WebSocket push).
type UpdateHook func(live AlertsResponse, newAlerts []Alert)

type Cache struct {
	mu       sync.RWMutex
	data     AlertsResponse
	prevIDs  map[string]struct{}
	store    *store.Store
	onUpdate UpdateHook
}

func NewCache(st *store.Store) *Cache {
	return &Cache{store: st, prevIDs: map[string]struct{}{}}
}

// OnUpdate registers a listener for live alert refreshes (e.g. WebSocket hub).
func (c *Cache) OnUpdate(hook UpdateHook) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.onUpdate = hook
}

func (c *Cache) Get() AlertsResponse {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.data
}

func (c *Cache) Set(data AlertsResponse) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data = data
}

func (c *Cache) StartPipeline(ctx context.Context, interval time.Duration) {
	c.update(ctx)
	go c.backfillIEM(ctx)
	ticker := time.NewTicker(interval)
	backfillTicker := time.NewTicker(24 * time.Hour)
	go func() {
		defer ticker.Stop()
		defer backfillTicker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				c.update(ctx)
			case <-backfillTicker.C:
				c.backfillIEM(ctx)
			}
		}
	}()
}

func (c *Cache) backfillIEM(ctx context.Context) {
	if c.store == nil {
		return
	}
	alerts, err := FetchIEMMaineHistory()
	if err != nil {
		log.Printf("nws.Cache: IEM backfill failed: %v", err)
		return
	}
	log.Printf("nws.Cache: IEM Maine backfill candidates=%d", len(alerts))
	c.processIncidents(ctx, alerts)
}

func (c *Cache) update(ctx context.Context) {
	bundle, err := FetchAlerts()
	if err != nil {
		log.Printf("nws.Cache: error fetching alerts: %v", err)
		return
	}

	c.mu.Lock()
	prev := c.prevIDs
	newOnes := make([]Alert, 0)
	nextIDs := make(map[string]struct{}, len(bundle.Live.Alerts))
	for _, a := range bundle.Live.Alerts {
		nextIDs[a.ID] = struct{}{}
		if prev != nil {
			if _, seen := prev[a.ID]; !seen {
				newOnes = append(newOnes, a)
			}
		}
	}
	// First successful poll seeds IDs without firing "new warning" spam.
	if prev == nil || len(prev) == 0 {
		newOnes = nil
	}
	c.data = bundle.Live
	c.prevIDs = nextIDs
	hook := c.onUpdate
	c.mu.Unlock()

	log.Printf("nws.Cache: live=%d new=%d archive-candidates=%d", len(bundle.Live.Alerts), len(newOnes), len(bundle.ToArchive))

	if hook != nil {
		hook(bundle.Live, newOnes)
	}

	if c.store != nil {
		c.processIncidents(ctx, bundle.ToArchive)
	}
}

func (c *Cache) processIncidents(ctx context.Context, alerts []Alert) {
	saved, failed := 0, 0
	for _, a := range alerts {
		scope := a.Scope
		if scope == "" {
			scope = classifyScope(a)
		}
		isTornado := IsTornado(a)
		source := a.Source
		if source == "" {
			source = "NWS API"
		}
		status := a.Status
		if status == "" {
			status = "expired"
		}
		issuedAt := time.Now().UTC()
		if parsed, err := time.Parse(time.RFC3339, a.StartsAt); err == nil {
			issuedAt = parsed
		}

		_, err := c.store.Client.TrackerIncident.UpsertOne(
			db.TrackerIncident.ID.Equals(a.ID),
		).Create(
			db.TrackerIncident.ID.Set(a.ID),
			db.TrackerIncident.Headline.Set(a.Headline),
			db.TrackerIncident.Category.Set(a.Category),
			db.TrackerIncident.Severity.Set(a.Severity),
			db.TrackerIncident.Area.Set(a.Area),
			db.TrackerIncident.Scope.Set(scope),
			db.TrackerIncident.Source.Set(source),
			db.TrackerIncident.SourceURL.Set(a.SourceURL),
			db.TrackerIncident.EventCode.Set(a.EventCode),
			db.TrackerIncident.Office.Set(a.Office),
			db.TrackerIncident.Status.Set(status),
			db.TrackerIncident.DatePulled.Set(issuedAt),
			db.TrackerIncident.StartsAt.Set(a.StartsAt),
			db.TrackerIncident.EndsAt.Set(a.EndsAt),
			db.TrackerIncident.Description.Set(a.Why),
			db.TrackerIncident.IsTornado.Set(isTornado),
		).Update(
			db.TrackerIncident.Headline.Set(a.Headline),
			db.TrackerIncident.Severity.Set(a.Severity),
			db.TrackerIncident.Area.Set(a.Area),
			db.TrackerIncident.Scope.Set(scope),
			db.TrackerIncident.Source.Set(source),
			db.TrackerIncident.SourceURL.Set(a.SourceURL),
			db.TrackerIncident.EventCode.Set(a.EventCode),
			db.TrackerIncident.Office.Set(a.Office),
			db.TrackerIncident.Status.Set(status),
			db.TrackerIncident.DatePulled.Set(issuedAt),
			db.TrackerIncident.EndsAt.Set(a.EndsAt),
			db.TrackerIncident.Description.Set(a.Why),
			db.TrackerIncident.IsTornado.Set(isTornado),
		).Exec(ctx)

		if err != nil {
			failed++
			log.Printf("nws.Cache: FAILED saving incident %s (scope=%s): %v", a.ID, scope, err)
			continue
		}
		saved++
	}
	if failed > 0 || saved > 0 {
		log.Printf("nws.Cache: archive upsert saved=%d failed=%d", saved, failed)
	}
}

func classifyScope(a Alert) string {
	if a.Scope != "" {
		return a.Scope
	}
	area := strings.ToLower(a.Area)
	if strings.Contains(area, "maine") || strings.Contains(area, "aroostook") ||
		strings.Contains(area, "penobscot") || strings.Contains(area, "me ") ||
		strings.HasSuffix(area, " me") || strings.Contains(area, ", me") {
		return "maine"
	}
	return "usa"
}
