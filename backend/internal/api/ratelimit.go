package api

import (
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// readLimiter is a light per-IP rate limit for public GET ops endpoints.
type readLimiter struct {
	mu      sync.Mutex
	buckets map[string]*readBucket
	limit   int
	window  time.Duration
}

type readBucket struct {
	count   int
	resetAt time.Time
}

func newReadLimiter(limit int, window time.Duration) *readLimiter {
	return &readLimiter{
		buckets: map[string]*readBucket{},
		limit:   limit,
		window:  window,
	}
}

func (l *readLimiter) allow(ip string) (ok bool, remaining int, resetSec int) {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	b := l.buckets[ip]
	if b == nil || now.After(b.resetAt) {
		b = &readBucket{count: 0, resetAt: now.Add(l.window)}
		l.buckets[ip] = b
	}
	if b.count >= l.limit {
		return false, 0, int(b.resetAt.Sub(now).Seconds()) + 1
	}
	b.count++
	return true, l.limit - b.count, int(b.resetAt.Sub(now).Seconds()) + 1
}

// RateLimitMiddleware applies a soft GET rate limit and sets X-RateLimit-* headers.
func RateLimitMiddleware(limitPerMin int) func(http.Handler) http.Handler {
	if limitPerMin <= 0 {
		limitPerMin = 120
	}
	lim := newReadLimiter(limitPerMin, time.Minute)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodGet && r.Method != http.MethodHead {
				next.ServeHTTP(w, r)
				return
			}
			// Skip health/ws-ish paths that are already cheap or long-lived.
			path := r.URL.Path
			if strings.HasSuffix(path, "/health") || strings.Contains(path, "/ws") {
				next.ServeHTTP(w, r)
				return
			}
			ip := clientIP(r)
			ok, remaining, resetSec := lim.allow(ip)
			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(limitPerMin))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
			w.Header().Set("X-RateLimit-Reset", strconv.Itoa(resetSec))
			if !ok {
				w.Header().Set("Retry-After", strconv.Itoa(resetSec))
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				_, _ = w.Write([]byte(`{"error":"rate limit exceeded","retryAfterSec":` + strconv.Itoa(resetSec) + `}`))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
