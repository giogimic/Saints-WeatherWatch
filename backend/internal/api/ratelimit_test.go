package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRateLimitMiddlewareAllowsThenBlocks(t *testing.T) {
	h := RateLimitMiddleware(2)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`ok`))
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/overview", nil)
	req.RemoteAddr = "203.0.113.9:1234"

	for i := 0; i < 2; i++ {
		rr := httptest.NewRecorder()
		h.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("req %d: want 200 got %d", i+1, rr.Code)
		}
		if rr.Header().Get("X-RateLimit-Limit") != "2" {
			t.Fatalf("missing limit header")
		}
	}

	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("want 429 got %d body=%s", rr.Code, rr.Body.String())
	}
	if rr.Header().Get("Retry-After") == "" {
		t.Fatal("expected Retry-After")
	}
}

func TestRateLimitSkipsHealth(t *testing.T) {
	h := RateLimitMiddleware(1)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	req.RemoteAddr = "203.0.113.10:1"
	for i := 0; i < 5; i++ {
		rr := httptest.NewRecorder()
		h.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("health should not be limited, got %d", rr.Code)
		}
	}
}
