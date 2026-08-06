package cams

import (
	"testing"
	"time"
)

func TestAnalyzeFrameBlack(t *testing.T) {
	// 1x1 near-black JPEG is hard; use tiny synthetic PNG via encode path —
	// instead verify undecodable → black.
	h := analyzeFrame([]byte("not-an-image"))
	if !h.Black {
		t.Fatal("expected undecodable to flag black")
	}
}

func TestClassifyHealth(t *testing.T) {
	now := time.Now()
	h, age := classifyHealth("cams", false, time.Time{}, false, 0, now)
	if h != HealthPending || age != 0 {
		t.Fatalf("pending got %s age=%d", h, age)
	}
	h, _ = classifyHealth("cams", true, now.Add(-30*time.Second), false, 0, now)
	if h != HealthOK {
		t.Fatalf("ok got %s", h)
	}
	h, _ = classifyHealth("cams", true, now.Add(-10*time.Minute), false, 0, now)
	if h != HealthStale {
		t.Fatalf("stale got %s", h)
	}
	h, _ = classifyHealth("cams", true, now.Add(-30*time.Second), true, 0, now)
	if h != HealthBlack {
		t.Fatalf("black got %s", h)
	}
	h, _ = classifyHealth("cams", false, time.Time{}, false, 2, now)
	if h != HealthError {
		t.Fatalf("error got %s", h)
	}
}

func TestAssignCorridorStJohn(t *testing.T) {
	id, label := AssignCorridor(47.25, -68.55)
	if id != "st-john" {
		t.Fatalf("got %s %s", id, label)
	}
}

func TestAssignCorridorOuter(t *testing.T) {
	id, _ := AssignCorridor(40.0, -70.0)
	if id != outerCorridorID {
		t.Fatalf("got %s", id)
	}
}

func TestAssignCorridorEmpty(t *testing.T) {
	id, label := AssignCorridor(0, 0)
	if id != "" || label != "" {
		t.Fatalf("got %s %s", id, label)
	}
}
