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
	return &Cache{
		store: st,
	}
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
	// Initial fetch
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
	resp, err := FetchAlerts()
	if err != nil {
		log.Printf("nws.Cache: error fetching alerts: %v", err)
		return
	}
	
	c.mu.Lock()
	c.data = resp
	c.mu.Unlock()
	log.Printf("nws.Cache: updated alerts, fetched %d active alerts", len(resp.Alerts))

	if c.store != nil {
		c.processIncidents(ctx, resp.Alerts)
	}
}

func (c *Cache) processIncidents(ctx context.Context, alerts []Alert) {
	for _, a := range alerts {
		// We want to track events near Edmundston (Aroostook County, ME) OR Tornadoes
		isNearEdmundston := strings.Contains(strings.ToLower(a.Area), "aroostook") || strings.Contains(strings.ToLower(a.Area), "penobscot")
		isTornado := strings.Contains(strings.ToLower(a.Category), "tornado") || strings.Contains(strings.ToLower(a.Headline), "tornado")
		
		if isNearEdmundston || isTornado {
			// Save to DB
			_, err := c.store.Client.TrackerIncident.UpsertOne(
				db.TrackerIncident.ID.Equals(a.ID),
			).Create(
				db.TrackerIncident.ID.Set(a.ID),
				db.TrackerIncident.Headline.Set(a.Headline),
				db.TrackerIncident.Category.Set(a.Category),
				db.TrackerIncident.Severity.Set(a.Severity),
				db.TrackerIncident.Area.Set(a.Area),
				db.TrackerIncident.StartsAt.Set(a.StartsAt),
				db.TrackerIncident.EndsAt.Set(a.EndsAt),
				db.TrackerIncident.Description.Set(a.Why),
				db.TrackerIncident.IsTornado.Set(isTornado),
			).Update(
				db.TrackerIncident.Headline.Set(a.Headline),
				db.TrackerIncident.Severity.Set(a.Severity),
				db.TrackerIncident.Area.Set(a.Area),
				db.TrackerIncident.EndsAt.Set(a.EndsAt),
				db.TrackerIncident.Description.Set(a.Why),
			).Exec(ctx)
			
			if err != nil {
				log.Printf("error saving tracker incident %s: %v", a.ID, err)
			}
		}
	}
}
