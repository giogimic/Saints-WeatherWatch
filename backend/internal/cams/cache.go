package cams

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"strings"
	"sync"
	"time"
)

//go:embed fallback.json
var fallbackJSON []byte

const (
	opencctvCamerasURL = "https://opencctv.org/api/cameras?bounds=%s"
	faaSitesURL        = "https://weathercams.faa.gov/api/sites"
	faaSummaryURL      = "https://weathercams.faa.gov/api/summary?siteId=%d&related=true"
	faaReferer         = "https://weathercams.faa.gov/"
	faaScheme          = "faa-weathercam://"
)

// Center of the Northern Maine / St. John Valley corridor (not branded to a single town).
var regionCenter = LatLng{Lat: 47.05, Lng: -68.35}

const (
	maxKM          = 200.0
	maxPageCams    = 16
	defaultRefresh = 60 * time.Second
)

type LatLng struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// CameraMeta is the public listing shape for /api/cams.
type CameraMeta struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Region      string  `json:"region"`
	Description string  `json:"description"`
	Status      string  `json:"status"`
	Type        string  `json:"type"` // image
	Group       string  `json:"group"` // cams | satellite | radar
	ImageURL    string  `json:"imageUrl"`
	Attribution string  `json:"attribution"`
	SourceURL   string  `json:"sourceUrl,omitempty"`
	Lat         float64 `json:"lat,omitempty"`
	Lng         float64 `json:"lng,omitempty"`
	Km          float64 `json:"km,omitempty"`
	Category    string  `json:"category,omitempty"`
}

type CameraConfig struct {
	ID              string
	Title           string
	Region          string
	Description     string
	Group           string
	Category        string
	Attribution     string
	SourceURL       string
	URL             string // may be http(s) or faa-weathercam://ID
	Lat             float64
	Lng             float64
	Km              float64
	RefreshInterval time.Duration
}

type CachedImage struct {
	Data        []byte
	ContentType string
	LastUpdated time.Time
}

type fallbackFile struct {
	Center struct {
		Lat   float64 `json:"lat"`
		Lng   float64 `json:"lng"`
		Label string  `json:"label"`
	} `json:"center"`
	MaxKM       float64 `json:"max_km"`
	MaxPageCams int     `json:"max_page_cams"`
	Cameras     []struct {
		ID            string  `json:"id"`
		Name          string  `json:"name"`
		Lat           float64 `json:"lat"`
		Lng           float64 `json:"lng"`
		Km            float64 `json:"km"`
		Category      string  `json:"category"`
		Source        string  `json:"source"`
		FeedURL       string  `json:"feed_url"`
		UpdateRateMS  int     `json:"update_rate_ms"`
		Region        string  `json:"region"`
		Attribution   string  `json:"attribution"`
	} `json:"cameras"`
}

type Cache struct {
	mu       sync.RWMutex
	configs  []CameraConfig
	images   map[string]CachedImage
	client   *http.Client
	faaURLs  map[string]string // cameraId -> current image URI
	faaSites map[int]struct{}  // nearby FAA siteIds to refresh
	center   LatLng
	maxKM    float64
	maxCams  int
	label    string
	done     <-chan struct{}
	pollers  map[string]struct{}
}

func NewCache() *Cache {
	c := &Cache{
		images:   make(map[string]CachedImage),
		faaURLs:  make(map[string]string),
		faaSites: make(map[int]struct{}),
		pollers:  make(map[string]struct{}),
		client:   &http.Client{Timeout: 20 * time.Second},
		center:   regionCenter,
		maxKM:    maxKM,
		maxCams:  maxPageCams,
		label:    "Northern Maine / St. John Valley",
	}
	c.configs = append(c.loadFallback(), staticImagery()...)
	return c
}

func (c *Cache) loadFallback() []CameraConfig {
	var fb fallbackFile
	if err := json.Unmarshal(fallbackJSON, &fb); err != nil {
		log.Printf("[Cams] fallback.json parse error: %v", err)
		return nil
	}
	if fb.Center.Lat != 0 {
		c.center = LatLng{Lat: fb.Center.Lat, Lng: fb.Center.Lng}
	}
	if fb.Center.Label != "" {
		c.label = fb.Center.Label
	}
	if fb.MaxKM > 0 {
		c.maxKM = fb.MaxKM
	}
	if fb.MaxPageCams > 0 {
		c.maxCams = fb.MaxPageCams
	}

	out := make([]CameraConfig, 0, len(fb.Cameras))
	for _, cam := range fb.Cameras {
		refresh := time.Duration(cam.UpdateRateMS) * time.Millisecond
		if refresh < 30*time.Second {
			refresh = defaultRefresh
		}
		if refresh > 5*time.Minute {
			refresh = 2 * time.Minute
		}
		out = append(out, CameraConfig{
			ID:              cam.ID,
			Title:           cam.Name,
			Region:          orDefault(cam.Region, c.label),
			Description:     fmt.Sprintf("%.0f km from corridor center · %s", cam.Km, cam.Category),
			Group:           "cams",
			Category:        cam.Category,
			Attribution:     orDefault(cam.Attribution, "© Public webcam"),
			SourceURL:       "https://opencctv.org/cameras",
			URL:             cam.FeedURL,
			Lat:             cam.Lat,
			Lng:             cam.Lng,
			Km:              cam.Km,
			RefreshInterval: refresh,
		})
		if strings.HasPrefix(cam.FeedURL, faaScheme) {
			c.noteFAACamera(strings.TrimPrefix(cam.FeedURL, faaScheme))
		}
	}
	return out
}

func staticImagery() []CameraConfig {
	return []CameraConfig{
		{
			ID:              "goes-east",
			Title:           "GOES-East GeoColor",
			Region:          "Northeast US",
			Description:     "True-color satellite. Updates every few minutes.",
			Group:           "satellite",
			Category:        "satellite",
			Attribution:     "© NOAA GOES-East",
			SourceURL:       "https://www.star.nesdis.noaa.gov/GOES/",
			URL:             "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ne/GEOCOLOR/latest.jpg",
			RefreshInterval: 5 * time.Minute,
		},
		{
			ID:              "goes-east-ir",
			Title:           "GOES-East Infrared",
			Region:          "Northeast US",
			Description:     "Band 13 IR — cloud-top temps and storm intensity.",
			Group:           "satellite",
			Category:        "satellite",
			Attribution:     "© NOAA GOES-East",
			SourceURL:       "https://www.star.nesdis.noaa.gov/GOES/",
			URL:             "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ne/13/latest.jpg",
			RefreshInterval: 5 * time.Minute,
		},
		{
			ID:              "noaa-radar-ne",
			Title:           "NE Radar Mosaic",
			Region:          "Northeast US",
			Description:     "NOAA RIDGE composite for the Northeast.",
			Group:           "radar",
			Category:        "radar",
			Attribution:     "© NOAA NWS",
			SourceURL:       "https://radar.weather.gov/",
			URL:             "https://radar.weather.gov/ridge/standard/NORTHEAST_0.gif",
			RefreshInterval: 3 * time.Minute,
		},
	}
}

func (c *Cache) Start(ctxDone <-chan struct{}, discoverEvery time.Duration) {
	log.Println("[Cams] Starting camera caching service...")
	c.done = ctxDone
	c.refreshFAA()
	for _, cfg := range c.snapshotConfigs() {
		c.fetch(cfg)
		c.ensurePoller(cfg)
	}

	if discoverEvery <= 0 {
		discoverEvery = time.Hour
	}

	go func() {
		time.Sleep(8 * time.Second)
		c.discoverFromOpenCCTV()
		ticker := time.NewTicker(discoverEvery)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				c.discoverFromOpenCCTV()
			case <-ctxDone:
				return
			}
		}
	}()

	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				c.refreshFAA()
			case <-ctxDone:
				return
			}
		}
	}()
}

func (c *Cache) ensurePoller(cfg CameraConfig) {
	c.mu.Lock()
	if _, ok := c.pollers[cfg.ID]; ok {
		c.mu.Unlock()
		return
	}
	c.pollers[cfg.ID] = struct{}{}
	done := c.done
	c.mu.Unlock()
	if done == nil {
		done = make(chan struct{})
	}
	go c.pollLoop(cfg, done)
}

func (c *Cache) pollLoop(cfg CameraConfig, done <-chan struct{}) {
	ticker := time.NewTicker(cfg.RefreshInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			// Re-read config in case discovery replaced this camera
			if live, ok := c.configByID(cfg.ID); ok {
				c.fetch(live)
			}
		case <-done:
			return
		}
	}
}

func (c *Cache) snapshotConfigs() []CameraConfig {
	c.mu.RLock()
	defer c.mu.RUnlock()
	out := make([]CameraConfig, len(c.configs))
	copy(out, c.configs)
	return out
}

func (c *Cache) configByID(id string) (CameraConfig, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	for _, cfg := range c.configs {
		if cfg.ID == id {
			return cfg, true
		}
	}
	return CameraConfig{}, false
}

func (c *Cache) fetch(cfg CameraConfig) {
	url := cfg.URL
	if strings.HasPrefix(url, faaScheme) {
		camID := strings.TrimPrefix(url, faaScheme)
		c.mu.RLock()
		resolved, ok := c.faaURLs[camID]
		c.mu.RUnlock()
		if !ok || resolved == "" {
			c.refreshFAA()
			c.mu.RLock()
			resolved, ok = c.faaURLs[camID]
			c.mu.RUnlock()
			if !ok || resolved == "" {
				log.Printf("[Cams] FAA camera %s not resolved yet", camID)
				return
			}
		}
		url = resolved
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Printf("[Cams] bad request %s: %v", cfg.ID, err)
		return
	}
	if !strings.Contains(url, "weathercams.faa.gov") && !strings.Contains(url, "wcams-static.faa.gov") {
		q := req.URL.Query()
		q.Set("t", fmt.Sprintf("%d", time.Now().UnixNano()))
		req.URL.RawQuery = q.Encode()
	}
	req.Header.Set("User-Agent", "SaintsWeatherWatch/1.0")
	if strings.Contains(url, "faa.gov") {
		req.Header.Set("Referer", faaReferer)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		log.Printf("[Cams] fetch %s failed: %v", cfg.ID, err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		log.Printf("[Cams] %s status %d", cfg.ID, resp.StatusCode)
		return
	}
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[Cams] read %s failed: %v", cfg.ID, err)
		return
	}
	if len(data) < 100 {
		log.Printf("[Cams] %s payload too small (%d bytes), skipping", cfg.ID, len(data))
		return
	}
	ct := resp.Header.Get("Content-Type")
	if ct == "" || strings.Contains(ct, "text/html") {
		ct = "image/jpeg"
	}

	c.mu.Lock()
	c.images[cfg.ID] = CachedImage{Data: data, ContentType: ct, LastUpdated: time.Now()}
	c.mu.Unlock()
	log.Printf("[Cams] Updated %s (%d bytes)", cfg.ID, len(data))
}

func (c *Cache) GetImage(id string) (CachedImage, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	img, ok := c.images[id]
	return img, ok
}

func (c *Cache) ListMeta() []CameraMeta {
	c.mu.RLock()
	defer c.mu.RUnlock()
	out := make([]CameraMeta, 0, len(c.configs))
	for _, cfg := range c.configs {
		status := "LIVE"
		if _, ok := c.images[cfg.ID]; !ok {
			status = "PENDING"
		}
		out = append(out, CameraMeta{
			ID:          cfg.ID,
			Title:       cfg.Title,
			Region:      cfg.Region,
			Description: cfg.Description,
			Status:      status,
			Type:        "image",
			Group:       cfg.Group,
			ImageURL:    "/api/cams/" + cfg.ID,
			Attribution: cfg.Attribution,
			SourceURL:   cfg.SourceURL,
			Lat:         cfg.Lat,
			Lng:         cfg.Lng,
			Km:          cfg.Km,
			Category:    cfg.Category,
		})
	}
	return out
}

func (c *Cache) ListIDs() []string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	ids := make([]string, len(c.configs))
	for i, cfg := range c.configs {
		ids[i] = cfg.ID
	}
	return ids
}

func orDefault(v, d string) string {
	if strings.TrimSpace(v) == "" {
		return d
	}
	return v
}

func haversineKM(a, b LatLng) float64 {
	const R = 6371.0
	p1, p2 := a.Lat*math.Pi/180, b.Lat*math.Pi/180
	dp := (b.Lat - a.Lat) * math.Pi / 180
	dl := (b.Lng - a.Lng) * math.Pi / 180
	h := math.Sin(dp/2)*math.Sin(dp/2) + math.Cos(p1)*math.Cos(p2)*math.Sin(dl/2)*math.Sin(dl/2)
	return 2 * R * math.Asin(math.Sqrt(h))
}
