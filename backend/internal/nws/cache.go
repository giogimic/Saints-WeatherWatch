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

type Cache struct {
	mu    sync.RWMutex
	data  AlertsResponse
	store *store.Store
}

func NewCache(st *store.Store) *Cache {
	return &Cache{store: st}
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
	ticker := time.NewTicker(interval)
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				c.update(ctx)
			}
		}
	}()
}

func (c *Cache) update(ctx context.Context) {
	bundle, err := FetchAlerts()
	if err != nil {
		log.Printf("nws.Cache: error fetching alerts: %v", err)
		return
	}

	c.mu.Lock()
	c.data = bundle.Live
	c.mu.Unlock()
	log.Printf("nws.Cache: live=%d archive-candidates=%d", len(bundle.Live.Alerts), len(bundle.ToArchive))

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

		_, err := c.store.Client.TrackerIncident.UpsertOne(
			db.TrackerIncident.ID.Equals(a.ID),
		).Create(
			db.TrackerIncident.ID.Set(a.ID),
			db.TrackerIncident.Headline.Set(a.Headline),
			db.TrackerIncident.Category.Set(a.Category),
			db.TrackerIncident.Severity.Set(a.Severity),
			db.TrackerIncident.Area.Set(a.Area),
			db.TrackerIncident.Scope.Set(scope),
			db.TrackerIncident.StartsAt.Set(a.StartsAt),
			db.TrackerIncident.EndsAt.Set(a.EndsAt),
			db.TrackerIncident.Description.Set(a.Why),
			db.TrackerIncident.IsTornado.Set(isTornado),
		).Update(
			db.TrackerIncident.Headline.Set(a.Headline),
			db.TrackerIncident.Severity.Set(a.Severity),
			db.TrackerIncident.Area.Set(a.Area),
			db.TrackerIncident.Scope.Set(scope),
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
