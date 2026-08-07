package cams

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"
)

type openCCTVCamera struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Lat        float64 `json:"lat"`
	Lng        float64 `json:"lng"`
	FeedURL    string  `json:"feed_url"`
	FeedType   string  `json:"feed_type"`
	UpdateRate int     `json:"update_rate"`
	Source     string  `json:"source"`
	Category   string  `json:"category"`
	Active     int     `json:"active"`
}

func (c *Cache) discoverFromOpenCCTV() {
	log.Println("[Cams] Discovering cameras from opencctv.org...")
	// Tile a ~220km box around the corridor center; API caps at 25/call.
	half := 1.9 // degrees ~210km lat
	s := c.center.Lat - half
	n := c.center.Lat + half
	w := c.center.Lng - half*1.4
	e := c.center.Lng + half*1.4
	step := 0.35

	seen := map[string]openCCTVCamera{}
	for lat := s; lat < n; lat += step {
		for lon := w; lon < e; lon += step {
			bounds := fmt.Sprintf("%.4f,%.4f,%.4f,%.4f", lat, lon, lat+step, lon+step)
			url := fmt.Sprintf(opencctvCamerasURL, bounds)
			cams, err := c.fetchOpenCCTVTile(url)
			if err != nil {
				continue
			}
			for _, cam := range cams {
				if cam.ID == "" {
					continue
				}
				seen[cam.ID] = cam
			}
			time.Sleep(40 * time.Millisecond)
		}
	}

	type ranked struct {
		cam openCCTVCamera
		km  float64
	}
	candidates := make([]ranked, 0, len(seen))
	for _, cam := range seen {
		if cam.Active == 0 || cam.FeedType != "image" {
			continue
		}
		fu := cam.FeedURL
		if !(strings.HasPrefix(fu, "http") || strings.HasPrefix(fu, faaScheme)) {
			continue
		}
		km := haversineKM(c.center, LatLng{Lat: cam.Lat, Lng: cam.Lng})
		if km > c.maxKM {
			continue
		}
		candidates = append(candidates, ranked{cam: cam, km: km})
	}
	sort.Slice(candidates, func(i, j int) bool { return candidates[i].km < candidates[j].km })

	picked := make([]CameraConfig, 0, c.maxCams)
	clusterCounts := map[string]int{}
	aviationSites := map[string]struct{}{}
	aviationCount := 0

	for _, r := range candidates {
		cam := r.cam
		key := fmt.Sprintf("%.2f,%.2f", round2(cam.Lat), round2(cam.Lng))
		cat := strings.ToLower(cam.Category)
		isAv := cat == "aviation" || cat == "airport"
		if isAv {
			site := strings.ToLower(strings.Split(cam.Name, "(")[0])
			aviationSites[site] = struct{}{}
			aviationCount++
		}
		if clusterCounts[key] >= 2 {
			continue
		}
		clusterCounts[key]++

		refresh := time.Duration(cam.UpdateRate) * time.Millisecond
		if refresh < 30*time.Second {
			refresh = defaultRefresh
		}
		if refresh > 5*time.Minute {
			refresh = 2 * time.Minute
		}
		id := strings.ReplaceAll(cam.ID, "/", "-")
		
		streamType := "image"
		lowerURL := strings.ToLower(cam.FeedURL)
		if strings.HasPrefix(lowerURL, faaScheme) {
			streamType = "burst"
		} else if strings.HasSuffix(lowerURL, ".m3u8") {
			streamType = "hls"
		} else if strings.HasSuffix(lowerURL, ".mjpg") || strings.HasSuffix(lowerURL, ".mjpeg") {
			streamType = "mjpeg"
		}

		cfg := CameraConfig{
			ID:              id,
			Title:           cam.Name,
			Region:          c.label,
			Description:     fmt.Sprintf("%.0f km from corridor center · %s", r.km, cam.Category),
			Group:           "cams",
			Category:        cam.Category,
			Attribution:     attributionFor(cam.Source),
			SourceURL:       "https://opencctv.org/cameras",
			URL:             cam.FeedURL,
			Lat:             cam.Lat,
			Lng:             cam.Lng,
			Km:              r.km,
			RefreshInterval: refresh,
			StreamType:      streamType,
		}
		if strings.HasPrefix(cam.FeedURL, faaScheme) {
			c.noteFAACamera(strings.TrimPrefix(cam.FeedURL, faaScheme))
		}
		picked = append(picked, cfg)
		if len(picked) >= c.maxCams {
			break
		}
	}

	if len(picked) == 0 {
		log.Println("[Cams] Discovery returned 0 cameras; keeping current list")
		return
	}

	// Preserve FKOC if discovery didn't include it and it was in fallback.
	for _, existing := range c.snapshotConfigs() {
		if existing.ID == "fkoc-stadium" {
			found := false
			for _, p := range picked {
				if p.ID == "fkoc-stadium" || p.URL == existing.URL {
					found = true
					break
				}
			}
			if !found {
				picked = append(picked, existing)
				sort.Slice(picked, func(i, j int) bool { return picked[i].Km < picked[j].Km })
				if len(picked) > c.maxCams {
					picked = picked[:c.maxCams]
				}
			}
			break
		}
	}

	imagery := staticImagery()
	newConfigs := append(picked, imagery...)

	c.mu.Lock()
	c.configs = newConfigs
	c.mu.Unlock()

	c.refreshFAA()
	for _, cfg := range picked {
		c.ensurePoller(cfg)
		c.fetch(cfg)
	}
	log.Printf("[Cams] Discovery applied %d road/field cams (+%d imagery)", len(picked), len(imagery))
}

func (c *Cache) fetchOpenCCTVTile(url string) ([]openCCTVCamera, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "SaintsWeatherWatch/1.0")
	req.Header.Set("Accept", "application/json")
	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("status %d", resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	body = stripBOM(body)
	var cams []openCCTVCamera
	if err := json.Unmarshal(body, &cams); err != nil {
		return nil, err
	}
	return cams, nil
}

func stripBOM(b []byte) []byte {
	if len(b) >= 3 && b[0] == 0xEF && b[1] == 0xBB && b[2] == 0xBF {
		return b[3:]
	}
	return b
}

func round2(v float64) float64 {
	return float64(int(v*100+0.5)) / 100
}

func attributionFor(source string) string {
	switch source {
	case "newengland":
		return "© New England 511"
	case "newbrunswick":
		return "© NB 511"
	case "faa-weathercams":
		return "© FAA WeatherCams"
	case "hivis":
		return "© USGS / HiVis"
	case "windy":
		return "© Windy Webcams"
	case "navcanada":
		return "© NAV CANADA"
	case "fkoc":
		return "© Fort Kent Outdoor Center"
	default:
		return "© Public webcam"
	}
}
