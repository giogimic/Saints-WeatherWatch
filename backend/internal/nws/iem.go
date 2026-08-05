package nws

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"
)

const iemVTECURL = "https://mesonet.agron.iastate.edu/json/vtec_events.py?wfo=%s&year=%d&fmt=json"

var maineWFOs = []struct {
	Code string
	Name string
}{
	{Code: "CAR", Name: "NWS Caribou"},
	{Code: "GYX", Name: "NWS Gray/Portland"},
}

type iemVTECResponse struct {
	Events []iemVTECEvent `json:"events"`
}

type iemVTECEvent struct {
	Phenomena        string  `json:"phenomena"`
	Significance     string  `json:"significance"`
	PhenomenaName    string  `json:"ph_name"`
	SignificanceName string  `json:"sig_name"`
	EventID          int     `json:"eventid"`
	Area             float64 `json:"area"`
	Locations        string  `json:"locations"`
	Issue            string  `json:"issue"`
	Expire           string  `json:"expire"`
	URL              string  `json:"url"`
	WFO              string  `json:"wfo"`
	Forecaster       string  `json:"fcster"`
}

// FetchIEMMaineHistory backfills the previous 18 months of Maine VTEC events
// from Iowa State's IEM archive. weather.im's IEMBot feed is excellent for
// current messages, but the VTEC service is the durable source for history.
func FetchIEMMaineHistory() ([]Alert, error) {
	now := time.Now().UTC()
	cutoff := now.AddDate(0, -18, 0)
	years := []int{now.Year()}
	if cutoff.Year() != now.Year() {
		years = append(years, cutoff.Year())
	}

	client := &http.Client{Timeout: 30 * time.Second}
	seen := map[string]struct{}{}
	alerts := make([]Alert, 0, 256)
	var errors []string

	for _, office := range maineWFOs {
		for _, year := range years {
			events, err := fetchIEMEvents(client, office.Code, year)
			if err != nil {
				errors = append(errors, fmt.Sprintf("%s/%d: %v", office.Code, year, err))
				continue
			}
			for _, event := range events {
				// GYX also covers New Hampshire. Keep this backfill strictly
				// Maine-scoped rather than treating every office event as Maine.
				if !strings.Contains(event.Locations, "[ME]") {
					continue
				}
				issued, err := time.Parse(time.RFC3339, event.Issue)
				if err != nil || issued.Before(cutoff) || issued.After(now.Add(24*time.Hour)) {
					continue
				}
				code := event.Phenomena + "." + event.Significance
				id := fmt.Sprintf("iem-%s-%d-%s-%d", office.Code, year, code, event.EventID)
				if _, ok := seen[id]; ok {
					continue
				}
				seen[id] = struct{}{}

				headline := strings.TrimSpace(event.PhenomenaName + " " + event.SignificanceName)
				if headline == "" {
					headline = "NWS " + code
				}
				status := "expired"
				if expires, err := time.Parse(time.RFC3339, event.Expire); err == nil && expires.After(now) {
					status = "active"
				}
				description := fmt.Sprintf(
					"Historical VTEC event %s from %s. Forecast office: %s.",
					code, office.Name, office.Code,
				)
				if event.Forecaster != "" {
					description += " Forecaster: " + event.Forecaster + "."
				}

				alerts = append(alerts, Alert{
					ID:            id,
					Severity:      iemSeverity(event.Phenomena, event.Significance),
					Area:          event.Locations,
					Headline:      headline,
					Status:        status,
					StartsAt:      event.Issue,
					EndsAt:        event.Expire,
					Category:      eventSlug(headline),
					Why:           description,
					LocationIndex: "Maine VTEC archive",
					Cause:         headline,
					WhatToDo:      "Historical record — verify details at the linked IEM VTEC product.",
					Scope:         "maine",
					Source:        "IEM VTEC",
					SourceURL:     event.URL,
					EventCode:     code,
					Office:        office.Name + " (" + office.Code + ")",
				})
			}
		}
	}

	sort.SliceStable(alerts, func(i, j int) bool {
		return alerts[i].StartsAt > alerts[j].StartsAt
	})
	if len(alerts) == 0 && len(errors) > 0 {
		return nil, fmt.Errorf("IEM backfill failed: %s", strings.Join(errors, "; "))
	}
	return alerts, nil
}

func fetchIEMEvents(client *http.Client, wfo string, year int) ([]iemVTECEvent, error) {
	url := fmt.Sprintf(iemVTECURL, wfo, year)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("status %d", resp.StatusCode)
	}
	var payload iemVTECResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, err
	}
	return payload.Events, nil
}

func iemSeverity(phenomena, significance string) string {
	if phenomena == "TO" || phenomena == "SV" || phenomena == "FF" ||
		phenomena == "BZ" || phenomena == "HU" {
		if significance == "W" {
			return "Severe"
		}
	}
	switch significance {
	case "W":
		return "Moderate"
	case "A":
		return "Moderate"
	case "Y", "S":
		return "Minor"
	default:
		return "Unknown"
	}
}

func eventSlug(name string) string {
	return strings.ToLower(strings.Join(strings.Fields(name), "-"))
}
