package ops

import (
	"fmt"
	"strings"
)

// DeskScore is the Phase E watch-zone impact score (0–100).
type DeskScore struct {
	Score int               `json:"score"`
	Band  string            `json:"band"` // quiet | watch | impact | critical
	Parts map[string]int    `json:"parts"`
	Note  string            `json:"note"`
}

// AlertInput is the minimal alert shape for scoring.
type AlertInput struct {
	Severity string
	Status   string
}

// CamInput is the minimal cam shape for scoring.
type CamInput struct {
	Health string
	AgeSec int
}

// ScoreWatchedZone computes a transparent desk score for a watch zone.
// Caps: alerts 40, outage 25, cams 20, flood 15. No severity inflation.
func ScoreWatchedZone(
	alerts []AlertInput,
	metersOut int,
	maineCovered bool,
	cams []CamInput,
	floodActionable int,
) DeskScore {
	parts := map[string]int{
		"alerts": 0,
		"outage": 0,
		"cams":   0,
		"flood":  0,
	}

	alertPts := 0
	for _, a := range alerts {
		sev := strings.ToLower(strings.TrimSpace(a.Severity))
		st := strings.ToLower(strings.TrimSpace(a.Status))
		switch {
		case sev == "extreme":
			alertPts += 14
		case sev == "severe":
			alertPts += 10
		case sev == "moderate":
			alertPts += 5
		case st == "watch":
			alertPts += 4
		default:
			alertPts += 2
		}
	}
	if alertPts > 40 {
		alertPts = 40
	}
	parts["alerts"] = alertPts

	outagePts := 0
	outageNote := ""
	if !maineCovered {
		outagePts = 0
		outageNote = "ME ODIN coverage thin — outage points not applied."
	} else {
		switch {
		case metersOut >= 5000:
			outagePts = 25
		case metersOut >= 1000:
			outagePts = 18
		case metersOut >= 200:
			outagePts = 12
		case metersOut >= 50:
			outagePts = 6
		case metersOut > 0:
			outagePts = 3
		}
	}
	parts["outage"] = outagePts

	camPts := 0
	if len(cams) == 0 {
		camPts = 0
	} else {
		okFresh := 0
		hurt := 0
		for _, c := range cams {
			h := strings.ToLower(c.Health)
			switch h {
			case "ok":
				if c.AgeSec <= 180 || c.AgeSec == 0 {
					okFresh++
				}
			case "stale":
				hurt++
			case "black", "error":
				hurt += 2
			}
		}
		// Start from share of healthy cams (up to 20), subtract for bad frames.
		ratio := float64(okFresh) / float64(len(cams))
		camPts = int(ratio * 20)
		camPts -= hurt * 2
		if camPts < 0 {
			camPts = 0
		}
		if camPts > 20 {
			camPts = 20
		}
		// Invert: bad cam health should RAISE impact score (desk concern).
		// Reinterpret: impact from cams = how many are unhealthy.
		concern := 0
		for _, c := range cams {
			h := strings.ToLower(c.Health)
			switch h {
			case "black", "error":
				concern += 6
			case "stale":
				concern += 3
			case "pending":
				concern += 1
			}
		}
		if concern > 20 {
			concern = 20
		}
		camPts = concern
	}
	parts["cams"] = camPts

	floodPts := floodActionable * 5
	if floodPts > 15 {
		floodPts = 15
	}
	parts["flood"] = floodPts

	total := parts["alerts"] + parts["outage"] + parts["cams"] + parts["flood"]
	if total > 100 {
		total = 100
	}

	band := "quiet"
	switch {
	case total >= 70:
		band = "critical"
	case total >= 45:
		band = "impact"
	case total >= 20:
		band = "watch"
	}

	note := fmt.Sprintf("Desk score %d (%s) · alerts %d · outage %d · cams %d · flood %d",
		total, band, parts["alerts"], parts["outage"], parts["cams"], parts["flood"])
	if outageNote != "" {
		note += " · " + outageNote
	}

	return DeskScore{
		Score: total,
		Band:  band,
		Parts: parts,
		Note:  note,
	}
}

// ImpactLayerCSV is the canonical Impact-mode map layer set.
const ImpactLayerCSV = "radar,warnings,cams,outages,flood"

// DefaultLayerCSV is the full ops map default.
const DefaultLayerCSV = "radar,warnings,lsr,cams,outages,flood,quakes"
