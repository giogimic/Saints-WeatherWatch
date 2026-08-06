package ops

import "time"

// FeedFreshness describes whether a cached ops feed is still timely.
type FeedFreshness struct {
	FetchedAt     string `json:"fetchedAt,omitempty"`
	AgeSec        int    `json:"ageSec,omitempty"`
	StaleAfterSec int    `json:"staleAfterSec"`
	Stale         bool   `json:"stale"`
	LastError     string `json:"lastError,omitempty"`
}

// FreshnessFromTime builds FeedFreshness from a last-success timestamp.
func FreshnessFromTime(fetchedAt time.Time, staleAfter time.Duration, lastErr string) FeedFreshness {
	now := time.Now().UTC()
	f := FeedFreshness{
		StaleAfterSec: int(staleAfter.Seconds()),
		LastError:     lastErr,
	}
	if fetchedAt.IsZero() {
		f.Stale = true
		return f
	}
	f.FetchedAt = fetchedAt.UTC().Format(time.RFC3339)
	age := int(now.Sub(fetchedAt.UTC()).Seconds())
	if age < 0 {
		age = 0
	}
	f.AgeSec = age
	f.Stale = time.Duration(age)*time.Second > staleAfter || lastErr != ""
	return f
}

// FreshnessFromGeneratedAt parses an RFC3339 generatedAt string.
func FreshnessFromGeneratedAt(generatedAt string, staleAfter time.Duration, lastErr string) FeedFreshness {
	if generatedAt == "" {
		return FreshnessFromTime(time.Time{}, staleAfter, lastErr)
	}
	t, err := time.Parse(time.RFC3339, generatedAt)
	if err != nil {
		// Try common variants
		t, err = time.Parse("2006-01-02T15:04:05Z07:00", generatedAt)
		if err != nil {
			return FreshnessFromTime(time.Time{}, staleAfter, lastErr)
		}
	}
	return FreshnessFromTime(t, staleAfter, lastErr)
}

// Default stale thresholds for ops feeds.
const (
	StaleAlerts  = 5 * time.Minute
	StaleOutages = 20 * time.Minute
	StaleHazards = 30 * time.Minute
	StaleRadar   = 3 * time.Minute
)

// PolicyNote is the shared no-scraping / resolution policy string.
const PolicyNote = "Official/licensed APIs only. County/municipality max for outages unless separately licensed. No address-level scraping."

// AttributionLine is the default ops source strip.
const AttributionLine = "NWS alerts · ODIN county outages · IEM radar · NOAA NWPS gauges · USGS quakes · public cams"
