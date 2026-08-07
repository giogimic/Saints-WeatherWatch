package nws

import (
	"encoding/xml"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// Environment Canada province warning feeds (English).
var canadaFeeds = []struct {
	URL   string
	Label string
}{
	{"https://weather.gc.ca/rss/warning/qc_e.xml", "Quebec"},
	{"https://weather.gc.ca/rss/warning/nb_e.xml", "New Brunswick"},
	{"https://weather.gc.ca/rss/warning/ns_e.xml", "Nova Scotia"},
	{"https://weather.gc.ca/rss/warning/pe_e.xml", "Prince Edward Island"},
	{"https://weather.gc.ca/rss/warning/nl_e.xml", "Newfoundland and Labrador"},
}

type atomFeed struct {
	Entries []atomEntry `xml:"entry"`
}

type atomEntry struct {
	ID      string `xml:"id"`
	Title   string `xml:"title"`
	Summary string `xml:"summary"`
	Updated string `xml:"updated"`
	Link    struct {
		Href string `xml:"href,attr"`
	} `xml:"link"`
	Category struct {
		Term string `xml:"term,attr"`
	} `xml:"category"`
}

// FetchCanadaAlerts pulls NB/QC warning Atom feeds. Best-effort.
func FetchCanadaAlerts() ([]Alert, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	out := make([]Alert, 0, 16)

	for _, feed := range canadaFeeds {
		req, err := http.NewRequest("GET", feed.URL, nil)
		if err != nil {
			continue
		}
		req.Header.Set("User-Agent", userAgent)
		req.Header.Set("Accept", "application/atom+xml, application/xml, text/xml")

		resp, err := client.Do(req)
		if err != nil || resp.StatusCode != http.StatusOK {
			if resp != nil {
				resp.Body.Close()
			}
			continue
		}

		var parsed atomFeed
		err = xml.NewDecoder(resp.Body).Decode(&parsed)
		resp.Body.Close()
		if err != nil {
			continue
		}

		for _, e := range parsed.Entries {
			title := strings.TrimSpace(e.Title)
			if title == "" || strings.EqualFold(title, "No alerts in effect") || strings.Contains(strings.ToLower(title), "no watches or warnings") {
				continue
			}
			id := e.ID
			if id == "" {
				id = fmt.Sprintf("ec-%s-%d", feed.Label, len(out))
			}
			sev := "Moderate"
			low := strings.ToLower(title + " " + e.Summary)
			if strings.Contains(low, "warning") || strings.Contains(low, "tornado") {
				sev = "Severe"
			}
			if strings.Contains(low, "extreme") {
				sev = "Extreme"
			}
			status := "active"
			if strings.Contains(low, "watch") {
				status = "watch"
			} else if strings.Contains(low, "advisory") {
				status = "advisory"
			}
			catTerm := e.Category.Term
			if catTerm == "" {
				catTerm = "canada-alert"
			}
			out = append(out, Alert{
				ID:            id,
				Severity:      sev,
				Area:          feed.Label,
				Headline:      truncateRunes(title, 140),
				Status:        status,
				StartsAt:      e.Updated,
				EndsAt:        "",
				Category:      strings.ToLower(strings.ReplaceAll(catTerm, " ", "-")),
				Why:           truncateRunes(stripTags(e.Summary), 280),
				LocationIndex: "EC: " + feed.Label,
				Cause:         title,
				WhatToDo:      "Follow Environment Canada guidance for your area.",
				Scope:         "canada",
				Source:        "Environment Canada",
				SourceURL:     e.Link.Href,
				Office:        feed.Label,
			})
		}
	}
	return out, nil
}

func stripTags(s string) string {
	var b strings.Builder
	inTag := false
	for _, r := range s {
		switch {
		case r == '<':
			inTag = true
		case r == '>':
			inTag = false
		case !inTag:
			b.WriteRune(r)
		}
	}
	return strings.TrimSpace(b.String())
}
