package nws

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	maineAlertsURL = "https://api.weather.gov/alerts/active?area=ME"
	usaAlertsURL   = "https://api.weather.gov/alerts/active"
	userAgent      = "(saints-weatherwatch, contact@example.com)"
)

type nwsFeatureCollection struct {
	Features []nwsFeature `json:"features"`
}

type nwsFeature struct {
	Properties nwsProperties `json:"properties"`
}

type nwsProperties struct {
	ID           string `json:"id"`
	AreaDesc     string `json:"areaDesc"`
	Effective    string `json:"effective"`
	Expires      string `json:"expires"`
	Severity     string `json:"severity"`
	Urgency      string `json:"urgency"`
	Event        string `json:"event"`
	Headline     string `json:"headline"`
	Description  string `json:"description"`
	Instruction  string `json:"instruction"`
}

var severityWeight = map[string]int{
	"Extreme":  4,
	"Severe":   3,
	"Moderate": 2,
	"Minor":    1,
}

// FetchBundle pulls Maine + USA alerts. Maine is fetched first so local alerts
// are never starved by the national top-N truncation used for live display.
type FetchBundle struct {
	Live      AlertsResponse // Maine-first slice for /api/alerts
	ToArchive []Alert        // full set to persist (already scoped)
}

func FetchAlerts() (FetchBundle, error) {
	maineRaw, err := fetchNWS(maineAlertsURL)
	if err != nil {
		return FetchBundle{}, fmt.Errorf("maine alerts: %w", err)
	}
	usaRaw, err := fetchNWS(usaAlertsURL)
	if err != nil {
		return FetchBundle{}, fmt.Errorf("usa alerts: %w", err)
	}

	maineIDs := map[string]struct{}{}
	maine := make([]Alert, 0, len(maineRaw))
	for _, f := range maineRaw {
		a := mapFeature(f, "maine")
		maineIDs[a.ID] = struct{}{}
		maine = append(maine, a)
	}
	sortBySeverity(maine)

	usa := make([]Alert, 0, len(usaRaw))
	for _, f := range usaRaw {
		a := mapFeature(f, "usa")
		if _, isME := maineIDs[a.ID]; isME {
			continue
		}
		// Archive-worthy national: Extreme/Severe, or tornado-related
		if !isArchiveWorthyNational(a) {
			continue
		}
		usa = append(usa, a)
	}
	sortBySeverity(usa)

	canada, _ := FetchCanadaAlerts() // best-effort; empty on failure

	toArchive := make([]Alert, 0, len(maine)+len(usa)+len(canada))
	toArchive = append(toArchive, maine...)
	toArchive = append(toArchive, usa...)
	toArchive = append(toArchive, canada...)

	// Live feed: Maine first, then a capped national+canada severe slice
	liveAlerts := make([]Alert, 0, 60)
	liveAlerts = append(liveAlerts, maine...)
	for _, a := range usa {
		if len(liveAlerts) >= 50 {
			break
		}
		liveAlerts = append(liveAlerts, a)
	}
	for _, a := range canada {
		if len(liveAlerts) >= 60 {
			break
		}
		liveAlerts = append(liveAlerts, a)
	}

	now := time.Now().UTC()
	history := buildHistory(append(append([]Alert{}, maine...), usa...))

	return FetchBundle{
		Live: AlertsResponse{
			GeneratedAt: now.Format(time.RFC3339),
			Alerts:      liveAlerts,
			History:     history,
		},
		ToArchive: toArchive,
	}, nil
}

func fetchNWS(url string) ([]nwsFeature, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "application/geo+json")

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var collection nwsFeatureCollection
	if err := json.NewDecoder(resp.Body).Decode(&collection); err != nil {
		return nil, err
	}
	return collection.Features, nil
}

func mapFeature(f nwsFeature, scope string) Alert {
	p := f.Properties
	status := "active"
	ev := strings.ToLower(p.Event)
	if strings.Contains(ev, "watch") {
		status = "watch"
	} else if strings.Contains(ev, "advisory") {
		status = "advisory"
	}
	category := strings.ToLower(strings.ReplaceAll(p.Event, " ", "-"))

	return Alert{
		ID:            p.ID,
		Severity:      p.Severity,
		Area:          truncateRunes(p.AreaDesc, 120),
		Headline:      truncateRunes(p.Headline, 140),
		Status:        status,
		StartsAt:      p.Effective,
		EndsAt:        p.Expires,
		Category:      category,
		Why:           truncateRunes(p.Description, 280),
		LocationIndex: "Zone: " + p.Severity,
		Cause:         p.Event,
		WhatToDo:      truncateRunes(p.Instruction, 180),
		Scope:         scope,
	}
}

func isArchiveWorthyNational(a Alert) bool {
	if a.Severity == "Extreme" || a.Severity == "Severe" {
		return true
	}
	blob := strings.ToLower(a.Category + " " + a.Headline + " " + a.Cause)
	return strings.Contains(blob, "tornado") || strings.Contains(blob, "hurricane") || strings.Contains(blob, "blizzard")
}

func sortBySeverity(alerts []Alert) {
	sort.SliceStable(alerts, func(i, j int) bool {
		return severityWeight[alerts[i].Severity] > severityWeight[alerts[j].Severity]
	})
}

func buildHistory(alerts []Alert) []HistoryLog {
	eventCounts := map[string]int{}
	eventLastSeen := map[string]string{}
	for _, a := range alerts {
		eventCounts[a.Cause]++
		if current, ok := eventLastSeen[a.Cause]; !ok || a.StartsAt > current {
			eventLastSeen[a.Cause] = a.StartsAt
		}
	}
	history := make([]HistoryLog, 0, len(eventCounts))
	for eventName, count := range eventCounts {
		category := strings.ToLower(strings.ReplaceAll(eventName, " ", "-"))
		history = append(history, HistoryLog{
			ID:            "hist-" + category,
			Category:      category,
			Headline:      eventName,
			LastSeen:      eventLastSeen[eventName],
			Count:         count,
			WhatItMeans:   "Tracked NWS " + eventName,
			LocationIndex: "Various",
		})
	}
	sort.SliceStable(history, func(i, j int) bool {
		return history[i].Count > history[j].Count
	})
	if len(history) > 10 {
		history = history[:10]
	}
	return history
}

func truncateRunes(s string, max int) string {
	if max <= 0 || s == "" {
		return s
	}
	if utf8.RuneCountInString(s) <= max {
		return s
	}
	runes := []rune(s)
	return string(runes[:max]) + "..."
}

// IsTornado reports whether an alert is tornado-related.
func IsTornado(a Alert) bool {
	blob := strings.ToLower(a.Category + " " + a.Headline + " " + a.Cause)
	return strings.Contains(blob, "tornado")
}
