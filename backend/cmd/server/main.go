package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"

	"github.com/saints-weatherwatch/backend/internal/api"
	"github.com/saints-weatherwatch/backend/internal/cams"
	"github.com/saints-weatherwatch/backend/internal/config"
	"github.com/saints-weatherwatch/backend/internal/nws"
	"github.com/saints-weatherwatch/backend/internal/store"
	"github.com/saints-weatherwatch/backend/internal/ws"
)

func main() {
	// Load backend/.env when present (ignored if missing).
	_ = godotenv.Load()

	cfg := config.Load()

	st, err := store.New(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("store init failed: %v", err)
	}
	defer st.Close()

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link", "X-Last-Updated"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	bgCtx, bgCancel := context.WithCancel(context.Background())
	defer bgCancel()

	hub := ws.NewHub(cfg.AllowedOrigins)
	go hub.Run(bgCtx.Done())

	nwsCache := nws.NewCache(st)
	nwsCache.OnUpdate(func(live nws.AlertsResponse, newAlerts []nws.Alert) {
		if len(newAlerts) > 0 {
			hub.PublishNewAlerts(live, newAlerts)
			return
		}
		hub.PublishSnapshot(live)
	})
	alertEvery := time.Duration(cfg.NWSAlertIntervalSec) * time.Second
	if alertEvery < 30*time.Second {
		alertEvery = 3 * time.Minute
	}
	nwsCache.StartPipeline(bgCtx, alertEvery)

	camCache := cams.NewCache()
	discoverEvery := time.Duration(cfg.CamDiscoverIntervalSec) * time.Second
	camCache.Start(bgCtx.Done(), discoverEvery)

	// WebSocket stays outside Timeout middleware so long-lived connections work.
	serveWS := func(w http.ResponseWriter, r *http.Request) {
		hub.ServeHTTP(w, r, nwsCache.Get)
	}
	r.Get("/ws", serveWS)
	// Also under /api so proxies that only forward /api still work.
	r.Get("/api/ws", serveWS)

	r.Group(func(r chi.Router) {
		r.Use(middleware.Timeout(60 * time.Second))
		api.Mount(r, st, nwsCache, camCache)
	})

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("Saints Weather Watch backend listening on :%s (db=%s)", cfg.Port, cfg.DatabaseURL)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	log.Println("shutting down...")
	bgCancel()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("forced shutdown: %v", err)
	}
	log.Println("bye")
}
