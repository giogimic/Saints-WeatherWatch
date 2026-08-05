package nws

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"
)

const alertsURL = "https://api.weather.gov/alerts/active"

type nwsFeatureCollection struct {
	Features []nwsFeature `json:"features"`
}

type nwsFeature struct {
	Properties nwsProperties `json:"properties"`
}

type nwsProperties struct {
	ID          string `json:"id"`
	AreaDesc    string `json:"areaDesc"`
	Effective   string `json:"effective"`
	Expires     string `json:"expires"`
	Severity    string `json:"severity"` // Extreme, Severe, Moderate, Minor, Unknown
	Urgency     string `json:"urgency"`
	Event       string `json:"event"`
	Headline    string `json:"headline"`
	Description string `json:"description"`
	Instruction string `json:"instruction"`
}

var severityWeight = map[string]int{
	"Extreme":  4,
	"Severe":   3,
	"Moderate": 2,
	"Minor":    1,
}

func FetchAlerts() (AlertsResponse, error) {
	req, err := http.NewRequest("GET", alertsURL, nil)
	if err != nil {
		return AlertsResponse{}, err
	}
	req.Header.Set("User-Agent", "(saints-weatherwatch, contact@example.com)")
	req.Header.Set("Accept", "application/geo+json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return AlertsResponse{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return AlertsResponse{}, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var collection nwsFeatureCollection
	if err := json.NewDecoder(resp.Body).Decode(&collection); err != nil {
		return AlertsResponse{}, err
	}

	alerts := make([]Alert, 0, len(collection.Features))
	eventCounts := make(map[string]int)
	eventLastSeen := make(map[string]string)

	now := time.Now().UTC()

	for _, f := range collection.Features {
		p := f.Properties
		
		// Filter out 'Unknown' or low-severity stuff if we want, but let's keep it simple
		// Status logic
		status := "active"
		if strings.Contains(strings.ToLower(p.Event), "watch") {
			status = "watch"
		} else if strings.Contains(strings.ToLower(p.Event), "advisory") {
			status = "advisory"
		}

		// Category slug logic
		category := strings.ToLower(strings.ReplaceAll(p.Event, " ", "-"))

		eventCounts[p.Event]++
		if current, ok := eventLastSeen[p.Event]; !ok || p.Effective > current {
			eventLastSeen[p.Event] = p.Effective
		}

		alerts = append(alerts, Alert{
			ID:            p.ID,
			Severity:      p.Severity,
			Area:          truncate(p.AreaDesc, 60),
			Headline:      truncate(p.Headline, 100),
			Status:        status,
			StartsAt:      p.Effective,
			EndsAt:        p.Expires,
			Category:      category,
			Why:           truncate(p.Description, 200),
			LocationIndex: "Zone: " + p.Severity, // A placeholder for now
			Cause:         p.Event,
			WhatToDo:      truncate(p.Instruction, 150),
		})
	}

	sort.SliceStable(alerts, func(i, j int) bool {
		return severityWeight[alerts[i].Severity] > severityWeight[alerts[j].Severity]
	})
	
	// Truncate to top 50 alerts to avoid massive payloads for frontend
	if len(alerts) > 50 {
		alerts = alerts[:50]
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
	
	// Sort history by count descending
	sort.SliceStable(history, func(i, j int) bool {
		return history[i].Count > history[j].Count
	})
	if len(history) > 10 {
		history = history[:10]
	}

	return AlertsResponse{
		GeneratedAt: now.Format(time.RFC3339),
		Alerts:      alerts,
		History:     history,
	}, nil
}

func truncate(s string, max int) string {
	if len(s) > max {
		return s[:max] + "..."
	}
	return s
}
