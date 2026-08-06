package cams

import (
	"bytes"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"math"
	"time"
)

// Health values surfaced on CameraMeta.
const (
	HealthOK      = "ok"
	HealthStale   = "stale"
	HealthBlack   = "black"
	HealthPending = "pending"
	HealthError   = "error"
)

type frameHealth struct {
	Black bool
}

// analyzeFrame detects near-black / blank frames via luma mean + variance sampling.
func analyzeFrame(data []byte) frameHealth {
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		// Undecodable payloads are treated as unhealthy/black-ish so UI flags them.
		return frameHealth{Black: true}
	}
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	if w < 8 || h < 8 {
		return frameHealth{Black: true}
	}
	stepX := w / 24
	if stepX < 1 {
		stepX = 1
	}
	stepY := h / 24
	if stepY < 1 {
		stepY = 1
	}
	var sum, sumSq float64
	var n float64
	for y := b.Min.Y; y < b.Max.Y; y += stepY {
		for x := b.Min.X; x < b.Max.X; x += stepX {
			r, g, bl, _ := img.At(x, y).RGBA()
			// 16-bit channels → 0..255 luma
			luma := (0.2126*float64(r) + 0.7152*float64(g) + 0.0722*float64(bl)) / 256.0
			sum += luma
			sumSq += luma * luma
			n++
		}
	}
	if n < 4 {
		return frameHealth{Black: true}
	}
	mean := sum / n
	variance := sumSq/n - mean*mean
	if variance < 0 {
		variance = 0
	}
	std := math.Sqrt(variance)
	// Near-black with almost no contrast → likely offline / covered / failed encoder.
	black := mean < 12 && std < 8
	return frameHealth{Black: black}
}

func classifyHealth(group string, hasImage bool, lastUpdated time.Time, black bool, consecutiveFails int, now time.Time) (health string, ageSec int) {
	if !hasImage {
		if consecutiveFails > 0 {
			return HealthError, 0
		}
		return HealthPending, 0
	}
	ageSec = int(now.Sub(lastUpdated).Seconds())
	if ageSec < 0 {
		ageSec = 0
	}
	if black {
		return HealthBlack, ageSec
	}
	if consecutiveFails >= 3 {
		return HealthError, ageSec
	}
	staleAfter := staleThreshold(group)
	if time.Duration(ageSec)*time.Second > staleAfter {
		return HealthStale, ageSec
	}
	return HealthOK, ageSec
}

func staleThreshold(group string) time.Duration {
	switch group {
	case "satellite":
		return 12 * time.Minute
	case "radar":
		return 8 * time.Minute
	default:
		return 5 * time.Minute
	}
}
