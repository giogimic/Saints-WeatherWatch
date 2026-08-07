package outages

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const cmpArcGISURL = "https://avangrid-maine-ags.esriemcs.com/arcgis/rest/services/CMPOutageMap_v2/MapServer/0/query?where=1=1&outFields=*&f=json"

type cmpScraper struct {
	client *http.Client
}

type esriResponse struct {
	Features []struct {
		Attributes map[string]interface{} `json:"attributes"`
	} `json:"features"`
}

func newCMPScraper() *cmpScraper {
	return &cmpScraper{
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

// Fetch returns a map of FIPS code to MetersOut.
func (s *cmpScraper) Fetch() (map[string]int, error) {
	req, err := http.NewRequest("GET", cmpArcGISURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Referer", "https://outagemap.cmpco.com/")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("cmp scraper returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var data esriResponse
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, fmt.Errorf("failed to parse cmp esri response: %w", err)
	}

	if len(data.Features) == 0 {
		return nil, fmt.Errorf("no features found in cmp arcgis response")
	}

	results := make(map[string]int)

	for _, feat := range data.Features {
		attrs := feat.Attributes
		
		var county string
		var out int

		for k, v := range attrs {
			kl := strings.ToLower(k)
			// Look for county name
			if kl == "county" || kl == "county_name" || kl == "countyname" {
				if str, ok := v.(string); ok {
					county = str
				}
			}
			// Look for outages
			if kl == "customers_out" || kl == "outages" || kl == "cust_out" || kl == "customers" {
				if num, ok := v.(float64); ok {
					out = int(num)
				}
			}
		}

		if county != "" {
			// Find FIPS by matching the county name
			countyClean := strings.TrimSpace(strings.ToLower(county))
			for fips, m := range meByFIPS {
				if strings.ToLower(m.Name) == countyClean {
					results[fips] = out
					break
				}
			}
		}
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("could not map any cmp counties")
	}

	return results, nil
}
