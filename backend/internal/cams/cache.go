package cams

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"
)

// CachedImage holds raw image bytes plus metadata.
type CachedImage struct {
	Data        []byte
	ContentType string
	LastUpdated time.Time
}

// CameraConfig defines a single camera feed to poll.
type CameraConfig struct {
	ID              string
	URL             string
	RefreshInterval time.Duration
}

// Cache fetches remote webcam images on a schedule and stores
// the latest frame in memory for instant serving.
type Cache struct {
	configs []CameraConfig
	images  map[string]CachedImage
	mu      sync.RWMutex
	client  *http.Client
}

// NewCache returns a Cache pre-configured with the known camera feeds.
func NewCache() *Cache {
	return &Cache{
		configs: []CameraConfig{
			// === Fort Kent / Northern Maine ===
			{
				ID:              "fkoc-stadium",
				URL:             "https://www.fortkentoc.org/webcam.jpg",
				RefreshInterval: 60 * time.Second,
			},
			{
				ID:              "mdot-dickey",
				URL:             "https://www.maine.gov/mdot/cams/all/dickey_Public.jpg",
				RefreshInterval: 60 * time.Second,
			},
			// === Aroostook County / Route 11 Corridor ===
			{
				ID:              "mdot-soucy",
				URL:             "https://www.maine.gov/mdot/cams/all/rt11soucy_Public.jpg",
				RefreshInterval: 60 * time.Second,
			},
			{
				ID:              "mdot-island-falls",
				URL:             "https://www.maine.gov/mdot/cams/all/islandfalls_Public.jpg",
				RefreshInterval: 2 * time.Minute,
			},
			{
				ID:              "mdot-smyrna",
				URL:             "https://www.maine.gov/mdot/cams/all/smyrna_Public.jpg",
				RefreshInterval: 2 * time.Minute,
			},
			// === NOAA Satellite Imagery ===
			{
				ID:              "goes-east",
				URL:             "https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/ne/GEOCOLOR/1000x1000.jpg",
				RefreshInterval: 5 * time.Minute,
			},
			{
				ID:              "goes-east-ir",
				URL:             "https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/ne/13/1000x1000.jpg",
				RefreshInterval: 5 * time.Minute,
			},
			// === NOAA Radar Mosaic ===
			{
				ID:              "noaa-radar-ne",
				URL:             "https://radar.weather.gov/ridge/standard/NORTHEAST_0.gif",
				RefreshInterval: 3 * time.Minute,
			},
		},
		images: make(map[string]CachedImage),
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

// Start begins background polling for all configured cameras.
func (c *Cache) Start(ctx context.Context) {
	log.Println("[Cams] Starting camera caching service...")

	// Initial fetch for all cameras
	for _, cfg := range c.configs {
		c.fetch(cfg)
	}

	// Individual goroutine per camera with its own ticker
	for _, cfg := range c.configs {
		go func(config CameraConfig) {
			ticker := time.NewTicker(config.RefreshInterval)
			defer ticker.Stop()
			for {
				select {
				case <-ticker.C:
					c.fetch(config)
				case <-ctx.Done():
					return
				}
			}
		}(cfg)
	}
}

func (c *Cache) fetch(cfg CameraConfig) {
	req, err := http.NewRequest("GET", cfg.URL, nil)
	if err != nil {
		log.Printf("[Cams] Failed to create request for %s: %v", cfg.ID, err)
		return
	}

	// Cache-busting query parameter
	q := req.URL.Query()
	q.Set("t", fmt.Sprintf("%d", time.Now().UnixNano()))
	req.URL.RawQuery = q.Encode()

	// Set a generic User-Agent to avoid being blocked
	req.Header.Set("User-Agent", "SaintsWeatherWatch/1.0")

	resp, err := c.client.Do(req)
	if err != nil {
		log.Printf("[Cams] Failed to fetch camera %s: %v", cfg.ID, err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("[Cams] Camera %s returned status %d", cfg.ID, resp.StatusCode)
		return
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[Cams] Failed to read body for camera %s: %v", cfg.ID, err)
		return
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "image/jpeg"
	}

	c.mu.Lock()
	c.images[cfg.ID] = CachedImage{
		Data:        data,
		ContentType: contentType,
		LastUpdated: time.Now(),
	}
	c.mu.Unlock()

	log.Printf("[Cams] Updated cache for %s (%d bytes)", cfg.ID, len(data))
}

// GetImage returns the cached image for the given camera ID.
func (c *Cache) GetImage(id string) (CachedImage, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	img, ok := c.images[id]
	return img, ok
}

// ListIDs returns all configured camera IDs.
func (c *Cache) ListIDs() []string {
	ids := make([]string, len(c.configs))
	for i, cfg := range c.configs {
		ids[i] = cfg.ID
	}
	return ids
}
