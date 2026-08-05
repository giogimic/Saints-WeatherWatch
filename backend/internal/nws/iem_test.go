package nws

import "testing"

func TestIEMSeverity(t *testing.T) {
	tests := []struct {
		phenomena    string
		significance string
		want         string
	}{
		{"TO", "W", "Severe"},
		{"SV", "W", "Severe"},
		{"BZ", "W", "Severe"},
		{"WI", "Y", "Minor"},
		{"WS", "A", "Moderate"},
		{"FL", "W", "Moderate"},
	}
	for _, tt := range tests {
		if got := iemSeverity(tt.phenomena, tt.significance); got != tt.want {
			t.Errorf("iemSeverity(%q, %q) = %q, want %q", tt.phenomena, tt.significance, got, tt.want)
		}
	}
}

func TestEventSlug(t *testing.T) {
	if got, want := eventSlug("Severe Thunderstorm Warning"), "severe-thunderstorm-warning"; got != want {
		t.Fatalf("eventSlug() = %q, want %q", got, want)
	}
}
