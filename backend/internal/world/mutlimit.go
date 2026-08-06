package world

import (
	"net/http"
	"sync"
	"time"
)

// Per-user mutation pacing — stops craft/trade spam from freezing SQLite.
const (
	MinCraftInterval  = 1500 * time.Millisecond
	MinTradeInterval  = 1500 * time.Millisecond
	MinVendorInterval = 900 * time.Millisecond
)

type mutKind int

const (
	mutCraft mutKind = iota
	mutTrade
	mutVendor
)

type mutBucket struct {
	craft  time.Time
	trade  time.Time
	vendor time.Time
}

var mutMu sync.Mutex
var mutByUser = map[string]*mutBucket{}

func allowMutation(userID string, kind mutKind) (ok bool, retryAfterMs int) {
	if userID == "" {
		return false, 1000
	}
	mutMu.Lock()
	defer mutMu.Unlock()
	now := time.Now()
	b := mutByUser[userID]
	if b == nil {
		b = &mutBucket{}
		mutByUser[userID] = b
	}
	var last time.Time
	var min time.Duration
	switch kind {
	case mutCraft:
		last, min = b.craft, MinCraftInterval
	case mutTrade:
		last, min = b.trade, MinTradeInterval
	case mutVendor:
		last, min = b.vendor, MinVendorInterval
	}
	if !last.IsZero() {
		elapsed := now.Sub(last)
		if elapsed < min {
			left := min - elapsed
			return false, int(left.Milliseconds()) + 1
		}
	}
	switch kind {
	case mutCraft:
		b.craft = now
	case mutTrade:
		b.trade = now
	case mutVendor:
		b.vendor = now
	}
	return true, 0
}

func writeRateLimited(w http.ResponseWriter, retryMs int) {
	if retryMs < 1 {
		retryMs = 500
	}
	sec := (retryMs + 999) / 1000
	if sec < 1 {
		sec = 1
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Retry-After", itoa(sec))
	w.WriteHeader(http.StatusTooManyRequests)
	_, _ = w.Write([]byte(`{"error":"slow down","retryAfterMs":` + itoa(retryMs) + `}`))
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var b [16]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		b[i] = '-'
	}
	return string(b[i:])
}

// AllowCraft gates craft mutations.
func AllowCraft(userID string) (bool, int) { return allowMutation(userID, mutCraft) }

// AllowTrade gates listing / buy / cancel.
func AllowTrade(userID string) (bool, int) { return allowMutation(userID, mutTrade) }

// AllowVendor gates vendor buy/sell.
func AllowVendor(userID string) (bool, int) { return allowMutation(userID, mutVendor) }

// WriteSlowDown responds 429 for world mutations.
func WriteSlowDown(w http.ResponseWriter, retryMs int) { writeRateLimited(w, retryMs) }
