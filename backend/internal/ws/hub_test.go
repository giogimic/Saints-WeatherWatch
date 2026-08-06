package ws

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/saints-weatherwatch/backend/internal/nws"
)

func TestPublishNewAlertsSkipsEmpty(t *testing.T) {
	h := NewHub(nil)
	done := make(chan struct{})
	go h.Run(done)
	defer close(done)

	h.PublishNewAlerts(nws.AlertsResponse{GeneratedAt: time.Now().UTC().Format(time.RFC3339)}, nil)
	select {
	case <-h.broadcast:
		t.Fatal("expected no broadcast for empty new alerts")
	case <-time.After(50 * time.Millisecond):
	}
}

func TestEnvelopeJSON(t *testing.T) {
	b, err := json.Marshal(Envelope{Type: "snapshot", GeneratedAt: "t", Alerts: []nws.Alert{{ID: "a1"}}})
	if err != nil {
		t.Fatal(err)
	}
	var env Envelope
	if err := json.Unmarshal(b, &env); err != nil {
		t.Fatal(err)
	}
	if env.Type != "snapshot" || len(env.Alerts) != 1 {
		t.Fatalf("bad decode: %+v", env)
	}
}
