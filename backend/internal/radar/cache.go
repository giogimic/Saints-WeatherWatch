package radar

import (
	"sync"
	"time"
)

// Cache holds a short-lived status snapshot for the corridor focus.
type Cache struct {
	client *Client
	mu     sync.RWMutex
	status *Status
	at     time.Time
	ttl    time.Duration
}

func NewCache(userAgent string) *Cache {
	return &Cache{
		client: NewClient(userAgent),
		ttl:    60 * time.Second,
	}
}

func (c *Cache) Client() *Client {
	return c.client
}

func (c *Cache) Status(lat, lon float64) (*Status, error) {
	c.mu.RLock()
	if c.status != nil && time.Since(c.at) < c.ttl &&
		approxSame(c.status.FocusLat, lat) && approxSame(c.status.FocusLon, lon) {
		defer c.mu.RUnlock()
		cp := *c.status
		return &cp, nil
	}
	c.mu.RUnlock()

	st, err := c.client.FetchStatus(lat, lon)
	if err != nil {
		return nil, err
	}
	c.mu.Lock()
	c.status = st
	c.at = time.Now()
	c.mu.Unlock()
	cp := *st
	return &cp, nil
}

func approxSame(a, b float64) bool {
	d := a - b
	if d < 0 {
		d = -d
	}
	return d < 0.05
}
