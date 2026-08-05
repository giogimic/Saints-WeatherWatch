package api

import (
	"encoding/json"
	"net/http"
	"sort"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/saints-weatherwatch/backend/internal/store"
)

type alert struct {
	ID            string `json:"id"`
	Severity      string `json:"severity"`
	Area          string `json:"area"`
	Headline      string `json:"headline"`
	Status        string `json:"status"`
	StartsAt      string `json:"startsAt"`
	EndsAt        string `json:"endsAt"`
	Category      string `json:"category"`
	Why           string `json:"why"`
	LocationIndex string `json:"locationIndex"`
	Cause         string `json:"cause"`
	WhatToDo      string `json:"whatToDo"`
}

type historyLog struct {
	ID            string `json:"id"`
	Category      string `json:"category"`
	Headline      string `json:"headline"`
	LastSeen      string `json:"lastSeen"`
	Count         int    `json:"count"`
	WhatItMeans   string `json:"whatItMeans"`
	LocationIndex string `json:"locationIndex"`
}

type alertsResponse struct {
	GeneratedAt string       `json:"generatedAt"`
	Alerts      []alert      `json:"alerts"`
	History     []historyLog `json:"history"`
}

type overviewResponse struct {
	GeneratedAt    string   `json:"generatedAt"`
	TotalAlerts    int      `json:"totalAlerts"`
	SevereAlerts   int      `json:"severeAlerts"`
	WatchCount     int      `json:"watchCount"`
	Categories     []string `json:"categories"`
	TopHeadline    string   `json:"topHeadline"`
	MostAtRiskArea string   `json:"mostAtRiskArea"`
}

var severityWeight = map[string]int{
	"Extreme":  4,
	"Severe":   3,
	"Moderate": 2,
	"Elevated": 1,
}

// Mount attaches all API routes to the provided router.
func Mount(r chi.Router, st *store.Store) {
	r.Route("/api", func(r chi.Router) {
		r.Get("/health", healthHandler(st))
		r.Get("/alerts", alertsHandler())
		r.Get("/overview", overviewHandler())
	})
}

// healthHandler reports server + DB readiness.
func healthHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status":     "ok",
			"serverTime": time.Now().UTC().Format(time.RFC3339),
			"service":    "saints-weatherwatch-backend",
		})
	}
}

func buildAlertsPayload(now time.Time) alertsResponse {
	payload := alertsResponse{
		GeneratedAt: now.Format(time.RFC3339),
		Alerts: []alert{
			{
				ID:            "nws-001",
				Severity:      "Extreme",
				Area:          "Central Plains",
				Headline:      "Tornado Warning",
				Status:        "active",
				StartsAt:      now.Add(-8 * time.Minute).Format(time.RFC3339),
				EndsAt:        now.Add(22 * time.Minute).Format(time.RFC3339),
				Category:      "tornado",
				Why:           "A strong rotating storm is present, and radar shows a tight spin pattern that can produce a tornado.",
				LocationIndex: "Zone A: close to the storm core",
				Cause:         "Wind shear and warm, unstable air are combining to help the storm rotate.",
				WhatToDo:      "Take shelter in the lowest interior room away from windows. Stay tuned for follow-up warnings.",
			},
			{
				ID:            "nws-002",
				Severity:      "Severe",
				Area:          "I-35 Corridor",
				Headline:      "Severe Thunderstorm Warning",
				Status:        "active",
				StartsAt:      now.Add(-15 * time.Minute).Format(time.RFC3339),
				EndsAt:        now.Add(35 * time.Minute).Format(time.RFC3339),
				Category:      "severe-thunderstorm",
				Why:           "Large hail and damaging winds are likely with this storm cell.",
				LocationIndex: "Zone B: storm is moving east-southeast",
				Cause:         "A strong updraft is lifting fast-moving air and producing dangerous outflow winds.",
				WhatToDo:      "Move vehicles off open roads, avoid trees and power lines, and seek sturdy shelter.",
			},
			{
				ID:            "nws-003",
				Severity:      "Moderate",
				Area:          "Western Kansas",
				Headline:      "Flash Flood Watch",
				Status:        "watch",
				StartsAt:      now.Add(-45 * time.Minute).Format(time.RFC3339),
				EndsAt:        now.Add(3 * time.Hour).Format(time.RFC3339),
				Category:      "flash-flood",
				Why:           "Heavy rain is possible and may move across low spots quickly.",
				LocationIndex: "Zone C: low-lying drainage areas are most vulnerable",
				Cause:         "A moist air mass is feeding repeated rain bands that could overwhelm drainage.",
				WhatToDo:      "Watch for water over roads and avoid driving through flooded streets.",
			},
			{
				ID:            "nws-004",
				Severity:      "Elevated",
				Area:          "Oklahoma Panhandle",
				Headline:      "High Wind Advisory",
				Status:        "advisory",
				StartsAt:      now.Add(-60 * time.Minute).Format(time.RFC3339),
				EndsAt:        now.Add(2 * time.Hour).Format(time.RFC3339),
				Category:      "high-wind",
				Why:           "A fast-moving pressure gradient is pushing stronger gusts across the area.",
				LocationIndex: "Zone D: exposed open roads and ridges will feel the strongest gusts",
				Cause:         "A tight pressure difference is accelerating air along the ground.",
				WhatToDo:      "Secure loose items, keep a firm grip on travel, and watch for blowing debris.",
			},
		},
		History: []historyLog{
			{ID: "hist-001", Category: "tornado", Headline: "Tornado Warning", LastSeen: now.Add(-45 * time.Minute).Format(time.RFC3339), Count: 3, WhatItMeans: "This is the most urgent storm category for a rotating cell.", LocationIndex: "Core zone tracked by radar rotation"},
			{ID: "hist-002", Category: "severe-thunderstorm", Headline: "Severe Thunderstorm Warning", LastSeen: now.Add(-65 * time.Minute).Format(time.RFC3339), Count: 5, WhatItMeans: "The storm has strong wind or hail potential, but it may not be fully rotating.", LocationIndex: "Line of storms moving across the region"},
			{ID: "hist-003", Category: "flash-flood", Headline: "Flash Flood Watch", LastSeen: now.Add(-90 * time.Minute).Format(time.RFC3339), Count: 2, WhatItMeans: "The setup is favorable for heavy rain and road flooding, even if flooding is not happening yet.", LocationIndex: "Drainage pathways and low spots"},
			{ID: "hist-004", Category: "high-wind", Headline: "High Wind Advisory", LastSeen: now.Add(-110 * time.Minute).Format(time.RFC3339), Count: 4, WhatItMeans: "A gusty air mass is moving through, mostly affecting open areas and exposed travel corridors.", LocationIndex: "Wide-area gust pattern"},
		},
	}

	sort.SliceStable(payload.Alerts, func(i, j int) bool {
		return severityWeight[payload.Alerts[i].Severity] > severityWeight[payload.Alerts[j].Severity]
	})

	return payload
}

func alertsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		payload := buildAlertsPayload(time.Now().UTC())

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(payload)
	}
}

func overviewHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		payload := buildAlertsPayload(time.Now().UTC())
		categories := make([]string, 0, len(payload.Alerts))
		seen := map[string]struct{}{}
		for _, alert := range payload.Alerts {
			if _, ok := seen[alert.Category]; ok {
				continue
			}
			seen[alert.Category] = struct{}{}
			categories = append(categories, alert.Category)
		}

		response := overviewResponse{
			GeneratedAt:    payload.GeneratedAt,
			TotalAlerts:    len(payload.Alerts),
			SevereAlerts:   0,
			WatchCount:     0,
			Categories:     categories,
			TopHeadline:    payload.Alerts[0].Headline,
			MostAtRiskArea: payload.Alerts[0].Area,
		}

		for _, alert := range payload.Alerts {
			if alert.Severity == "Severe" || alert.Severity == "Extreme" {
				response.SevereAlerts++
			}
			if alert.Status == "watch" {
				response.WatchCount++
			}
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(response)
	}
}
