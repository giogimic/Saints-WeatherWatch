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
	LocationIndex string `json:"locationIndex"` // Mocked logic or mapping
	Cause         string `json:"cause"`
	WhatToDo      string `json:"whatToDo"`
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
}
