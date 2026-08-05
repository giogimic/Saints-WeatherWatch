package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config holds all runtime configuration sourced from environment variables.
type Config struct {
	Port           string
	DatabaseURL    string
	AllowedOrigins []string

	// Polling intervals (seconds)
	NWSAlertIntervalSec   int
	IEMReportIntervalSec  int
	SPCOutlookIntervalSec int
	CamDiscoverIntervalSec int

	// Upstream contact info (NWS requires a User-Agent)
	UserAgent string
}

// Load reads configuration from the environment with sensible defaults.
func Load() Config {
	c := Config{
		Port:                   envOr("PORT", "8080"),
		DatabaseURL:            envOr("DATABASE_URL", "file:./data/weatherwatch.db"),
		NWSAlertIntervalSec:    envInt("NWS_ALERT_INTERVAL_SEC", 60),
		IEMReportIntervalSec:   envInt("IEM_REPORT_INTERVAL_SEC", 120),
		SPCOutlookIntervalSec:  envInt("SPC_OUTLOOK_INTERVAL_SEC", 600),
		CamDiscoverIntervalSec: envInt("CAM_DISCOVER_INTERVAL_SEC", 3600),
		UserAgent:              envOr("USER_AGENT", "SaintsWeatherWatch/1.0 (saintsweatherwatch.app)"),
	}

	origins := envOr("ALLOWED_ORIGINS", "http://localhost:4200,http://127.0.0.1:4200,https://wn.saintsgaming.net")
	c.AllowedOrigins = strings.Split(origins, ",")

	return c
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
		var n int
		if _, err := fmt.Sscanf(v, "%d", &n); err == nil {
			return n
		}
	}
	return fallback
}
