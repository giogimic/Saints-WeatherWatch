package cams

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
)

func (c *Cache) noteFAACamera(cameraID string) {
	cameraID = strings.TrimSpace(cameraID)
	if cameraID == "" {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if _, ok := c.faaURLs[cameraID]; !ok {
		c.faaURLs[cameraID] = nil
	}
}

func (c *Cache) refreshFAA() {
	c.mu.RLock()
	needed := make([]string, 0, len(c.faaURLs))
	for id, uris := range c.faaURLs {
		if len(uris) == 0 {
			needed = append(needed, id)
		}
	}
	// Also refresh URIs we already have (timestamps rotate)
	for id := range c.faaURLs {
		needed = append(needed, id)
	}
	c.mu.RUnlock()
	if len(needed) == 0 {
		return
	}

	sites, err := c.fetchFAASites()
	if err != nil {
		log.Printf("[Cams] FAA sites fetch failed: %v", err)
		return
	}

	// Prefer northern ME / nearby sites within maxKM of corridor center
	type siteHit struct {
		id int
		km float64
	}
	hits := make([]siteHit, 0, 16)
	for _, s := range sites {
		if !strings.EqualFold(s.State, "ME") && !strings.EqualFold(s.Country, "CA") {
			// Still allow ME only for speed; NB/QC FAA rare
			if !strings.EqualFold(s.State, "ME") {
				continue
			}
		}
		km := haversineKM(c.center, LatLng{Lat: s.Latitude, Lng: s.Longitude})
		if km > c.maxKM+20 {
			continue
		}
		hits = append(hits, siteHit{id: s.SiteID, km: km})
	}
	sort.SliceStable(hits, func(i, j int) bool { return hits[i].km < hits[j].km })
	if len(hits) > 12 {
		hits = hits[:12]
	}

	resolved := 0
	for _, h := range hits {
		cams, err := c.fetchFAASummary(h.id)
		if err != nil {
			continue
		}
		c.mu.Lock()
		for camID, uris := range cams {
			c.faaURLs[camID] = uris
			resolved++
		}
		c.faaSites[h.id] = struct{}{}
		c.mu.Unlock()
	}
	log.Printf("[Cams] FAA refresh: %d image URIs across %d sites", resolved, len(hits))
}

type faaSite struct {
	SiteID    int     `json:"siteId"`
	SiteName  string  `json:"siteName"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	State     string  `json:"state"`
	Country   string  `json:"country"`
}

type faaSitesResponse struct {
	Payload []faaSite `json:"payload"`
}

func (c *Cache) fetchFAASites() ([]faaSite, error) {
	req, err := http.NewRequest("GET", faaSitesURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "SaintsWeatherWatch/1.0")
	req.Header.Set("Referer", faaReferer)
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
	var parsed faaSitesResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		// payload may be object with sites key in some versions
		var alt struct {
			Payload struct {
				Sites []faaSite `json:"sites"`
			} `json:"payload"`
		}
		if err2 := json.Unmarshal(body, &alt); err2 != nil {
			return nil, err
		}
		return alt.Payload.Sites, nil
	}
	if len(parsed.Payload) == 0 {
		var alt struct {
			Payload struct {
				Sites []faaSite `json:"sites"`
			} `json:"payload"`
		}
		if err := json.Unmarshal(body, &alt); err == nil && len(alt.Payload.Sites) > 0 {
			return alt.Payload.Sites, nil
		}
	}
	return parsed.Payload, nil
}

func (c *Cache) fetchFAASummary(siteID int) (map[string][]string, error) {
	url := fmt.Sprintf(faaSummaryURL, siteID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "SaintsWeatherWatch/1.0")
	req.Header.Set("Referer", faaReferer)
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

	var parsed struct {
		Payload struct {
			Site struct {
				Cameras []struct {
					CameraID      any `json:"cameraId"`
					CurrentImages []struct {
						ImageURI string `json:"imageUri"`
					} `json:"currentImages"`
				} `json:"cameras"`
			} `json:"site"`
		} `json:"payload"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, err
	}
	out := map[string][]string{}
	for _, cam := range parsed.Payload.Site.Cameras {
		id := stringifyID(cam.CameraID)
		if id == "" || len(cam.CurrentImages) == 0 {
			continue
		}
		var uris []string
		for _, img := range cam.CurrentImages {
			if img.ImageURI != "" {
				uris = append(uris, img.ImageURI)
			}
		}
		if len(uris) > 0 {
			out[id] = uris
		}
	}
	return out, nil
}

func stringifyID(v any) string {
	switch t := v.(type) {
	case string:
		return t
	case float64:
		return strconv.FormatInt(int64(t), 10)
	case json.Number:
		return t.String()
	default:
		return fmt.Sprintf("%v", t)
	}
}
