package auth

import (
	"sync"
	"time"
)

type attemptBucket struct {
	fails    int
	lockedUntil time.Time
	windowStart time.Time
}

// PINLimiter slows brute-force against 4-digit PINs.
type PINLimiter struct {
	mu      sync.Mutex
	buckets map[string]*attemptBucket
	maxFails int
	lockFor  time.Duration
	window   time.Duration
}

func NewPINLimiter() *PINLimiter {
	return &PINLimiter{
		buckets:  map[string]*attemptBucket{},
		maxFails: 8,
		lockFor:  15 * time.Minute,
		window:   15 * time.Minute,
	}
}

func (l *PINLimiter) key(ip, name string) string {
	return ip + "|" + NormalizeName(name)
}

func (l *PINLimiter) Allowed(ip, name string) (ok bool, retryAfter time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()
	k := l.key(ip, name)
	b := l.buckets[k]
	now := time.Now()
	if b == nil {
		return true, 0
	}
	if now.Before(b.lockedUntil) {
		return false, b.lockedUntil.Sub(now)
	}
	if now.Sub(b.windowStart) > l.window {
		b.fails = 0
		b.windowStart = now
	}
	return true, 0
}

func (l *PINLimiter) Fail(ip, name string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	k := l.key(ip, name)
	b := l.buckets[k]
	now := time.Now()
	if b == nil {
		b = &attemptBucket{windowStart: now}
		l.buckets[k] = b
	}
	if now.Sub(b.windowStart) > l.window {
		b.fails = 0
		b.windowStart = now
	}
	b.fails++
	if b.fails >= l.maxFails {
		b.lockedUntil = now.Add(l.lockFor)
		b.fails = 0
	}
}

func (l *PINLimiter) Success(ip, name string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.buckets, l.key(ip, name))
}
