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
	maxKM          = 2500.0
	maxPageCams    = 500
	defaultRefresh = 60 * time.Second
)

type LatLng struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// CameraMeta is the public listing shape for /api/cams.
type CameraMeta struct {
	ID             string   `json:"id"`
	Title          string   `json:"title"`
	Region         string   `json:"region"`
	Description    string   `json:"description"`
	Status         string   `json:"status"`
	Type           string   `json:"type"` // image | iframe
	Group          string   `json:"group"` // cams | satellite | radar
	ImageURL       string   `json:"imageUrl"`
	EmbedURL       string   `json:"embedUrl,omitempty"`
	Attribution    string   `json:"attribution"`
	SourceURL      string   `json:"sourceUrl,omitempty"`
	Lat            float64  `json:"lat,omitempty"`
	Lng            float64  `json:"lng,omitempty"`
	Km             float64  `json:"km,omitempty"`
	Category       string   `json:"category,omitempty"`
	Health         string   `json:"health,omitempty"` // ok | stale | black | pending | error
	LastUpdated    string   `json:"lastUpdated,omitempty"`
	AgeSec         int      `json:"ageSec,omitempty"`
	BlackFrame     bool     `json:"blackFrame,omitempty"`
	CorridorID     string   `json:"corridorId,omitempty"`
	CorridorLabel  string   `json:"corridorLabel,omitempty"`
	NearAlertIDs   []string `json:"nearAlertIds,omitempty"`
	NearAlertCount int      `json:"nearAlertCount,omitempty"`
	StreamType        string   `json:"streamType,omitempty"` // image | burst | mjpeg | hls
	BurstURLs         []string `json:"burstUrls,omitempty"`
	SupportsEmbedding bool     `json:"supportsEmbedding"`
	AuthRequired      bool     `json:"authRequired"`
	WeatherTags       []string `json:"weatherTags,omitempty"`
	FailoverCamID     string   `json:"failoverCamId,omitempty"`
	FailoverCamTitle  string   `json:"failoverCamTitle,omitempty"`
	ProvinceState     string   `json:"provinceState,omitempty"`
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
	StreamType      string // image | burst | mjpeg | hls
	SupportsEmbedding bool
	AuthRequired      bool
	WeatherTags       []string
	ProvinceState     string
}

type CachedImage struct {
	Data        []byte
	ContentType string
	LastUpdated time.Time
	BlackFrame  bool
}

type camRuntime struct {
	ConsecutiveFails int
	LastError        string
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
		StreamType    string  `json:"stream_type"`
		UpdateRateMS  int     `json:"update_rate_ms"`
		Region        string  `json:"region"`
		Attribution   string  `json:"attribution"`
	} `json:"cameras"`
}

type Cache struct {
	mu       sync.RWMutex
	configs  []CameraConfig
	images   map[string]CachedImage
	runtime  map[string]*camRuntime
	client   *http.Client
	faaURLs  map[string][]string // cameraId -> current image URIs (burst)
	faaSites map[int]struct{}    // nearby FAA siteIds to refresh
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
		runtime:  make(map[string]*camRuntime),
		faaURLs:  make(map[string][]string),
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
		streamType := cam.StreamType
		if streamType == "" {
			streamType = "image"
			lowerURL := strings.ToLower(cam.FeedURL)
			if strings.HasPrefix(lowerURL, faaScheme) {
				streamType = "burst"
			} else if strings.HasSuffix(lowerURL, ".m3u8") {
				streamType = "hls"
			} else if strings.HasSuffix(lowerURL, ".mjpg") || strings.HasSuffix(lowerURL, ".mjpeg") {
				streamType = "mjpeg"
			}
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
			StreamType:      streamType,
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
			StreamType:      "image",
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
			StreamType:      "image",
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
			StreamType:      "image",
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

func (c *Cache) FetchLatest(id string) (CachedImage, error) {
	c.mu.RLock()
	img, ok := c.images[id]
	if ok && len(img.Data) > 0 {
		c.mu.RUnlock()
		return img, nil
	}
	c.mu.RUnlock()
	return CachedImage{}, fmt.Errorf("image not found for %s", id)
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
		uris, ok := c.faaURLs[camID]
		c.mu.RUnlock()
		if !ok || len(uris) == 0 {
			c.refreshFAA()
			c.mu.RLock()
			uris, ok = c.faaURLs[camID]
			c.mu.RUnlock()
			if !ok || len(uris) == 0 {
				log.Printf("[Cams] FAA camera %s not resolved yet", camID)
				c.noteFetchFail(cfg.ID, "faa unresolved")
				return
			}
		}
		url = uris[0]
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Printf("[Cams] bad request %s: %v", cfg.ID, err)
		c.noteFetchFail(cfg.ID, err.Error())
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
		c.noteFetchFail(cfg.ID, err.Error())
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		log.Printf("[Cams] %s status %d", cfg.ID, resp.StatusCode)
		c.noteFetchFail(cfg.ID, fmt.Sprintf("status %d", resp.StatusCode))
		return
	}
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[Cams] read %s failed: %v", cfg.ID, err)
		c.noteFetchFail(cfg.ID, err.Error())
		return
	}
	if len(data) < 100 {
		log.Printf("[Cams] %s payload too small (%d bytes), skipping", cfg.ID, len(data))
		c.noteFetchFail(cfg.ID, "payload too small")
		return
	}
	ct := resp.Header.Get("Content-Type")
	if ct == "" || strings.Contains(ct, "text/html") {
		ct = "image/jpeg"
	}

	fh := analyzeFrame(data)
	c.mu.Lock()
	c.images[cfg.ID] = CachedImage{
		Data:        data,
		ContentType: ct,
		LastUpdated: time.Now(),
		BlackFrame:  fh.Black,
	}
	rt := c.runtime[cfg.ID]
	if rt == nil {
		rt = &camRuntime{}
		c.runtime[cfg.ID] = rt
	}
	rt.ConsecutiveFails = 0
	rt.LastError = ""
	c.mu.Unlock()
	if fh.Black {
		log.Printf("[Cams] Updated %s (%d bytes) · black-frame suspected", cfg.ID, len(data))
	} else {
		log.Printf("[Cams] Updated %s (%d bytes)", cfg.ID, len(data))
	}
}

func (c *Cache) noteFetchFail(id, reason string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	rt := c.runtime[id]
	if rt == nil {
		rt = &camRuntime{}
		c.runtime[id] = rt
	}
	rt.ConsecutiveFails++
	rt.LastError = reason
}

func (c *Cache) GetImage(id string) (CachedImage, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	img, ok := c.images[id]
	return img, ok
}

// AlertRef is the minimal alert geometry needed for cam proximity.
type AlertRef struct {
	ID          string
	Headline    string
	Severity    string
	CentroidLat *float64
	CentroidLon *float64
	Geometry    interface{}
}

func (c *Cache) ListMeta() []CameraMeta {
	return c.ListMetaWithAlerts(nil)
}

func (c *Cache) ListMetaWithAlerts(alerts []AlertRef) []CameraMeta {
	c.mu.RLock()
	defer c.mu.RUnlock()

	out := make([]CameraMeta, 0, len(c.configs))
	for _, cfg := range c.configs {
		img := c.images[cfg.ID]
		hasImg := len(img.Data) > 0
		rt := c.runtime[cfg.ID]
		health := HealthPending
		if hasImg {
			health = HealthOK
			if time.Since(img.LastUpdated) > 3*cfg.RefreshInterval {
				health = HealthStale
			}
			if img.BlackFrame {
				health = HealthBlack
			}
		}
		if rt != nil && rt.ConsecutiveFails > 2 {
			health = HealthError
		}

		// Calculate age in seconds for cache-busting hints
		ageSec := int(time.Since(img.LastUpdated).Seconds())
		if ageSec < 0 {
			ageSec = 0
		}
		black := img.BlackFrame

		status := "OK"
		switch health {
		case HealthPending:
			status = "WAIT"
		case HealthBlack:
			status = "BLACK"
		case HealthStale:
			status = "STALE"
		case HealthError:
			status = "ERROR"
		}
		corrID, corrLabel := AssignCorridor(cfg.Lat, cfg.Lng)
		
		var burstURLs []string
		if cfg.StreamType == "burst" && strings.HasPrefix(cfg.URL, faaScheme) {
			camID := strings.TrimPrefix(cfg.URL, faaScheme)
			if uris, ok := c.faaURLs[camID]; ok && len(uris) > 0 {
				burstURLs = uris
				// If we have burst URLs, then it's effectively "OK" and has an image
				if health == HealthPending {
					health = HealthOK
					status = "OK"
				}
			}
		}

		tags := cfg.WeatherTags
		if len(tags) == 0 {
			tags = []string{cfg.Category, "visibility", "regional-surveillance"}
		}

		provState := cfg.ProvinceState
		if provState == "" {
			if strings.Contains(cfg.Region, "Maine") {
				provState = "ME"
			} else if strings.Contains(cfg.Region, "Québec") || strings.Contains(cfg.Region, "Quebec") {
				provState = "QC"
			} else if strings.Contains(cfg.Region, "Brunswick") {
				provState = "NB"
			} else if strings.Contains(cfg.Region, "Nova Scotia") {
				provState = "NS"
			} else if strings.Contains(cfg.Region, "Island") {
				provState = "PE"
			} else if strings.Contains(cfg.Region, "Newfoundland") {
				provState = "NL"
			}
		}

		camType := "image"
		if cfg.StreamType == "iframe" {
			camType = "iframe"
		}
		var embedURL string
		if camType == "iframe" {
			embedURL = cfg.URL
		}

		meta := CameraMeta{
			ID:                cfg.ID,
			Title:             cfg.Title,
			Region:            cfg.Region,
			Description:       cfg.Description,
			Status:            status,
			Type:              camType,
			Group:             cfg.Group,
			ImageURL:          "/api/cams/" + cfg.ID,
			EmbedURL:          embedURL,
			Attribution:       cfg.Attribution,
			SourceURL:         cfg.SourceURL,
			Lat:               cfg.Lat,
			Lng:               cfg.Lng,
			Km:                cfg.Km,
			Category:          cfg.Category,
			Health:            health,
			AgeSec:            ageSec,
			BlackFrame:        black,
			CorridorID:        corrID,
			CorridorLabel:     corrLabel,
			StreamType:        cfg.StreamType,
			BurstURLs:         burstURLs,
			SupportsEmbedding: true,
			AuthRequired:      false,
			WeatherTags:       tags,
			ProvinceState:     provState,
		}

		// Automatic Failover: if primary camera is unhealthy (Error or Black), find nearest working camera
		if health == HealthError || health == HealthBlack {
			var bestDist = 999999.0
			var bestID = ""
			var bestTitle = ""
			for _, other := range c.configs {
				if other.ID == cfg.ID {
					continue
				}
				otherImg := c.images[other.ID]
				if len(otherImg.Data) > 0 && !otherImg.BlackFrame {
					dist := haversineKM(LatLng{Lat: cfg.Lat, Lng: cfg.Lng}, LatLng{Lat: other.Lat, Lng: other.Lng})
					if dist < bestDist {
						bestDist = dist
						bestID = other.ID
						bestTitle = other.Title
					}
				}
			}
			if bestID != "" {
				meta.FailoverCamID = bestID
				meta.FailoverCamTitle = fmt.Sprintf("%s (%.1f km away)", bestTitle, bestDist)
			}
		}

		if hasImg {
			meta.LastUpdated = img.LastUpdated.UTC().Format(time.RFC3339)
		}
		if cfg.Group == "cams" && cfg.Lat != 0 && cfg.Lng != 0 && len(alerts) > 0 {
			ids := nearAlertIDs(cfg.Lat, cfg.Lng, alerts, 40)
			if len(ids) > 0 {
				meta.NearAlertIDs = ids
				meta.NearAlertCount = len(ids)
			}
		}
		out = append(out, meta)
	}
	return out
}

// NearWarnings returns road cams near active alerts (within radiusMiles).
func (c *Cache) NearWarnings(alerts []AlertRef, radiusMiles float64) []map[string]any {
	if radiusMiles <= 0 {
		radiusMiles = 40
	}
	list := c.ListMetaWithAlerts(alerts)
	out := make([]map[string]any, 0)
	for _, cam := range list {
		if cam.Group != "cams" || cam.NearAlertCount == 0 {
			continue
		}
		out = append(out, map[string]any{
			"camera":         cam,
			"nearAlertIds":   cam.NearAlertIDs,
			"nearAlertCount": cam.NearAlertCount,
		})
	}
	return out
}

// CamsNearPoint returns road cams within radiusMiles of a lat/lon.
func (c *Cache) CamsNearPoint(lat, lon, radiusMiles float64) []CameraMeta {
	if radiusMiles <= 0 {
		radiusMiles = 25
	}
	list := c.ListMeta()
	out := make([]CameraMeta, 0)
	for _, cam := range list {
		if cam.Group != "cams" || (cam.Lat == 0 && cam.Lng == 0) {
			continue
		}
		// Convert km haversine → miles (~0.621371)
		dMiles := haversineKM(LatLng{Lat: lat, Lng: lon}, LatLng{Lat: cam.Lat, Lng: cam.Lng}) * 0.621371
		if dMiles <= radiusMiles {
			out = append(out, cam)
		}
	}
	return out
}

func nearAlertIDs(lat, lng float64, alerts []AlertRef, radiusMiles float64) []string {
	ids := make([]string, 0)
	for _, a := range alerts {
		okMatch, _ := alertNearCam(lat, lng, radiusMiles, a)
		if okMatch {
			ids = append(ids, a.ID)
		}
	}
	return ids
}

func alertNearCam(lat, lng, radiusMiles float64, a AlertRef) (bool, bool) {
	// Inline to avoid cams→geo import cycle concerns; duplicate thin check.
	if a.Geometry != nil {
		if m, ok := a.Geometry.(map[string]interface{}); ok {
			coords := flattenCoords(m["coordinates"])
			for _, c := range coords {
				d := haversineKM(LatLng{Lat: lat, Lng: lng}, LatLng{Lat: c[1], Lng: c[0]}) * 0.621371
				if d <= radiusMiles {
					return true, false
				}
			}
		}
	}
	if a.CentroidLat != nil && a.CentroidLon != nil {
		d := haversineKM(LatLng{Lat: lat, Lng: lng}, LatLng{Lat: *a.CentroidLat, Lng: *a.CentroidLon}) * 0.621371
		if d <= radiusMiles {
			return true, true
		}
	}
	return false, false
}

func flattenCoords(node interface{}) [][2]float64 {
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
		out = append(out, flattenCoords(child)...)
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
