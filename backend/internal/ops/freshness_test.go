package ops

import (
	"testing"
	"time"
)

func TestFreshnessStaleWhenZero(t *testing.T) {
	f := FreshnessFromTime(time.Time{}, StaleAlerts, "")
	if !f.Stale {
		t.Fatal("expected stale")
	}
}

func TestFreshnessFresh(t *testing.T) {
	f := FreshnessFromGeneratedAt(time.Now().UTC().Add(-30*time.Second).Format(time.RFC3339), StaleAlerts, "")
	if f.Stale {
		t.Fatalf("expected fresh, got %+v", f)
	}
	if f.AgeSec < 20 || f.AgeSec > 60 {
		t.Fatalf("age=%d", f.AgeSec)
	}
}

func TestFreshnessOld(t *testing.T) {
	f := FreshnessFromGeneratedAt(time.Now().UTC().Add(-10*time.Minute).Format(time.RFC3339), StaleAlerts, "")
	if !f.Stale {
		t.Fatal("expected stale after 10m")
	}
}

func TestFreshnessErrorMarksStale(t *testing.T) {
	f := FreshnessFromGeneratedAt(time.Now().UTC().Add(-10*time.Second).Format(time.RFC3339), StaleAlerts, "poll failed")
	if !f.Stale || f.LastError == "" {
		t.Fatalf("got %+v", f)
	}
}
