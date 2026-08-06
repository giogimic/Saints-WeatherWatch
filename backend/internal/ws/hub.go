// Package ws is a lightweight WebSocket hub for live alert pushes.
package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"github.com/saints-weatherwatch/backend/internal/nws"
)

type Envelope struct {
	Type        string      `json:"type"` // snapshot | new_alerts | ping
	GeneratedAt string      `json:"generatedAt,omitempty"`
	Alerts      []nws.Alert `json:"alerts,omitempty"`
	NewAlerts   []nws.Alert `json:"newAlerts,omitempty"`
}

type client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

// Hub fans out alert snapshots / new-warning events to connected browsers.
type Hub struct {
	mu         sync.RWMutex
	clients    map[*client]struct{}
	register   chan *client
	unregister chan *client
	broadcast  chan []byte
	origins    map[string]struct{}
	upgrader   websocket.Upgrader
}

func NewHub(allowedOrigins []string) *Hub {
	origins := make(map[string]struct{}, len(allowedOrigins))
	for _, o := range allowedOrigins {
		o = strings.TrimSpace(o)
		if o != "" {
			origins[o] = struct{}{}
		}
	}
	h := &Hub{
		clients:    make(map[*client]struct{}),
		register:   make(chan *client),
		unregister: make(chan *client),
		broadcast:  make(chan []byte, 16),
		origins:    origins,
	}
	h.upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			origin := r.Header.Get("Origin")
			if origin == "" {
				return true
			}
			if len(h.origins) == 0 {
				return true
			}
			_, ok := h.origins[origin]
			return ok
		},
	}
	return h
}

func (h *Hub) Run(ctxDone <-chan struct{}) {
	ping := time.NewTicker(25 * time.Second)
	defer ping.Stop()
	for {
		select {
		case <-ctxDone:
			h.mu.Lock()
			for c := range h.clients {
				close(c.send)
				_ = c.conn.Close()
				delete(h.clients, c)
			}
			h.mu.Unlock()
			return
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c] = struct{}{}
			h.mu.Unlock()
		case c := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				close(c.send)
			}
			h.mu.Unlock()
		case msg := <-h.broadcast:
			h.mu.RLock()
			for c := range h.clients {
				select {
				case c.send <- msg:
				default:
					// Drop frame for slow clients — don't disconnect (forces reconnect spam).
				}
			}
			h.mu.RUnlock()
		case <-ping.C:
			payload, _ := json.Marshal(Envelope{Type: "ping", GeneratedAt: time.Now().UTC().Format(time.RFC3339)})
			select {
			case h.broadcast <- payload:
			default:
			}
		}
	}
}

func (h *Hub) PublishSnapshot(live nws.AlertsResponse) {
	h.publish(Envelope{
		Type:        "snapshot",
		GeneratedAt: live.GeneratedAt,
		Alerts:      live.Alerts,
	})
}

func (h *Hub) PublishNewAlerts(live nws.AlertsResponse, newOnes []nws.Alert) {
	if len(newOnes) == 0 {
		return
	}
	h.publish(Envelope{
		Type:        "new_alerts",
		GeneratedAt: live.GeneratedAt,
		Alerts:      live.Alerts,
		NewAlerts:   newOnes,
	})
}

func (h *Hub) publish(env Envelope) {
	b, err := json.Marshal(env)
	if err != nil {
		return
	}
	select {
	case h.broadcast <- b:
	default:
		log.Printf("ws.Hub: broadcast buffer full, dropping %s", env.Type)
	}
}

// ServeHTTP upgrades to WebSocket and optionally seeds a snapshot from getLive.
func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request, getLive func() nws.AlertsResponse) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws.Hub: upgrade failed: %v", err)
		return
	}
	c := &client{
		hub:  h,
		conn: conn,
		send: make(chan []byte, 8),
	}
	h.register <- c

	if getLive != nil {
		live := getLive()
		if b, err := json.Marshal(Envelope{
			Type:        "snapshot",
			GeneratedAt: live.GeneratedAt,
			Alerts:      live.Alerts,
		}); err == nil {
			select {
			case c.send <- b:
			default:
			}
		}
	}

	go c.writePump()
	go c.readPump()
}

func (c *client) readPump() {
	defer func() {
		c.hub.unregister <- c
		_ = c.conn.Close()
	}()
	_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			break
		}
	}
}

func (c *client) writePump() {
	ticker := time.NewTicker(20 * time.Second)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
