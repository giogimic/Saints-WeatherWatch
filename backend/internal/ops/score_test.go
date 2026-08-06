package ops

import "testing"

func TestScoreQuiet(t *testing.T) {
	s := ScoreWatchedZone(nil, 0, true, nil, 0)
	if s.Score != 0 || s.Band != "quiet" {
		t.Fatalf("got %+v", s)
	}
}

func TestScoreSevereAlerts(t *testing.T) {
	s := ScoreWatchedZone([]AlertInput{
		{Severity: "Severe"},
		{Severity: "Extreme"},
	}, 0, true, nil, 0)
	if s.Parts["alerts"] != 24 {
		t.Fatalf("alerts=%d", s.Parts["alerts"])
	}
	if s.Band == "quiet" {
		t.Fatal("expected elevated band")
	}
}

func TestScoreOutageBuckets(t *testing.T) {
	s := ScoreWatchedZone(nil, 250, true, nil, 0)
	if s.Parts["outage"] != 12 {
		t.Fatalf("outage=%d", s.Parts["outage"])
	}
	// Uncovered ME → no outage points
	s2 := ScoreWatchedZone(nil, 5000, false, nil, 0)
	if s2.Parts["outage"] != 0 {
		t.Fatal("expected zero when not covered")
	}
}

func TestScoreCamConcern(t *testing.T) {
	s := ScoreWatchedZone(nil, 0, true, []CamInput{
		{Health: "ok", AgeSec: 30},
		{Health: "black", AgeSec: 10},
		{Health: "stale", AgeSec: 600},
	}, 0)
	if s.Parts["cams"] != 9 { // 6 + 3
		t.Fatalf("cams=%d", s.Parts["cams"])
	}
}

func TestScoreFloodCap(t *testing.T) {
	s := ScoreWatchedZone(nil, 0, true, nil, 10)
	if s.Parts["flood"] != 15 {
		t.Fatalf("flood=%d", s.Parts["flood"])
	}
}

func TestScoreCriticalBand(t *testing.T) {
	alerts := make([]AlertInput, 0, 5)
	for i := 0; i < 5; i++ {
		alerts = append(alerts, AlertInput{Severity: "Extreme"})
	}
	s := ScoreWatchedZone(alerts, 5000, true, []CamInput{
		{Health: "error"}, {Health: "black"}, {Health: "black"}, {Health: "stale"},
	}, 3)
	if s.Score < 70 || s.Band != "critical" {
		t.Fatalf("got %+v", s)
	}
}
