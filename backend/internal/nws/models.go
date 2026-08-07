package nws

type Alert struct {
	ID            string `json:"id"`
	Severity      string `json:"severity"`
	Area          string `json:"area"`
	Headline      string `json:"headline"`
	Status        string `json:"status"` // active, watch, advisory
	StartsAt      string `json:"startsAt"`
	EndsAt        string `json:"endsAt"`
	Category      string `json:"category"`
	Why           string `json:"why"`
	LocationIndex string `json:"locationIndex"`
	Cause         string `json:"cause"`
	WhatToDo      string `json:"whatToDo"`
	// maine | usa | canada | global — used by archive + live grouping
	Scope     string `json:"scope"`
	Source    string `json:"source"`
	SourceURL string `json:"sourceUrl,omitempty"`
	EventCode string `json:"eventCode,omitempty"`
	Office    string `json:"office,omitempty"`
	// Optional geometry for radius filtering / map display
	CentroidLat *float64    `json:"centroidLat,omitempty"`
	CentroidLon *float64    `json:"centroidLon,omitempty"`
	Geometry    interface{} `json:"geometry,omitempty"`
}

type HistoryLog struct {
	ID            string `json:"id"`
	Category      string `json:"category"`
	Headline      string `json:"headline"`
	LastSeen      string `json:"lastSeen"`
	Count         int    `json:"count"`
	WhatItMeans   string `json:"whatItMeans"`
	LocationIndex string `json:"locationIndex"`
}

type AlertsResponse struct {
	GeneratedAt string       `json:"generatedAt"`
	Alerts      []Alert      `json:"alerts"`
	History     []HistoryLog `json:"history"`
	// Phase F freshness
	FetchedAt     string `json:"fetchedAt,omitempty"`
	AgeSec        int    `json:"ageSec,omitempty"`
	StaleAfterSec int    `json:"staleAfterSec,omitempty"`
	Stale         bool   `json:"stale,omitempty"`
	LastError     string `json:"lastError,omitempty"`
}

// AlertCentroid extracts lat/lng from optional centroid pointers.
func AlertCentroid(a Alert) (lat, lng float64, ok bool) {
	if a.CentroidLat != nil && a.CentroidLon != nil {
		return *a.CentroidLat, *a.CentroidLon, true
	}
	return 0, 0, false
}
