package world

import (
	"log"
	"net/http"
	"strings"
	"sync"

	"github.com/saints-weatherwatch/backend/internal/auth"
	"github.com/saints-weatherwatch/backend/internal/nws"
	"github.com/saints-weatherwatch/backend/internal/store"
)

// LobbyDef is a named shard of the same Storm World map.
type LobbyDef struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Blurb      string `json:"blurb"`
	MaxPlayers int    `json:"maxPlayers"`
}

// LobbyStatus is the live lobby list row.
type LobbyStatus struct {
	LobbyDef
	Players int  `json:"players"`
	Full    bool `json:"full"`
}

// DefaultLobbies — same map + land-cover tables; separate presence/drops/events.
var DefaultLobbies = []LobbyDef{
	{ID: "main", Name: "Main Corridor", Blurb: "Play together here — default shared world.", MaxPlayers: 32},
	{ID: "alpha", Name: "Shard Alpha", Blurb: "Overflow shard · separate from Main.", MaxPlayers: 24},
	{ID: "bravo", Name: "Shard Bravo", Blurb: "Overflow shard · separate from Main.", MaxPlayers: 24},
	{ID: "practice", Name: "Practice Range", Blurb: "Quiet shard for learning (not the main group).", MaxPlayers: 16},
}

// Hub owns multiple Rooms (shards). Inventory/craft/trade stay global.
type Hub struct {
	st      *store.Store
	nws     *nws.Cache
	origins []string
	defs    []LobbyDef
	mu      sync.Mutex
	rooms   map[string]*Room
	done    <-chan struct{}
}

func NewHub(st *store.Store, allowedOrigins []string) *Hub {
	return &Hub{
		st:      st,
		origins: append([]string(nil), allowedOrigins...),
		defs:    append([]LobbyDef(nil), DefaultLobbies...),
		rooms:   map[string]*Room{},
	}
}

// AttachAlerts wires the live NWS cache for Phase 4 research ticks (read-only).
func (h *Hub) AttachAlerts(cache *nws.Cache) {
	if h == nil {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	h.nws = cache
	for _, r := range h.rooms {
		r.nws = cache
	}
}

// Run starts every predefined lobby room and blocks until done.
func (h *Hub) Run(done <-chan struct{}) {
	h.mu.Lock()
	h.done = done
	for _, def := range h.defs {
		h.ensureRoomLocked(def.ID)
	}
	for id, r := range h.rooms {
		r.start(done)
		log.Printf("world.Hub: lobby ready %s", id)
	}
	h.mu.Unlock()
	<-done
}

func (h *Hub) getOrCreate(id string) *Room {
	id = NormalizeLobbyID(id)
	h.mu.Lock()
	defer h.mu.Unlock()
	r := h.ensureRoomLocked(id)
	if h.done != nil {
		r.start(h.done)
	}
	return r
}

func (h *Hub) ensureRoomLocked(id string) *Room {
	if r, ok := h.rooms[id]; ok {
		return r
	}
	def := h.defLocked(id)
	r := NewRoom(h.st, h.origins)
	r.id = def.ID
	r.name = def.Name
	r.maxPlayers = def.MaxPlayers
	r.nws = h.nws
	h.rooms[id] = r
	return r
}

func (h *Hub) defLocked(id string) LobbyDef {
	for _, d := range h.defs {
		if d.ID == id {
			return d
		}
	}
	// Unknown id → clone main template under that slug (still capped).
	return LobbyDef{
		ID: id, Name: "Lobby " + id, Blurb: "Custom shard.", MaxPlayers: 24,
	}
}

// ListLobbies returns live player counts for the lobby picker.
func (h *Hub) ListLobbies() []LobbyStatus {
	h.mu.Lock()
	defer h.mu.Unlock()
	out := make([]LobbyStatus, 0, len(h.defs))
	for _, def := range h.defs {
		n := 0
		if r, ok := h.rooms[def.ID]; ok {
			n = r.PlayerCount()
		}
		out = append(out, LobbyStatus{
			LobbyDef: def,
			Players:  n,
			Full:     n >= def.MaxPlayers,
		})
	}
	return out
}

// ServeWS routes the socket into ?lobby= (default main). One user → one lobby.
func (h *Hub) ServeWS(w http.ResponseWriter, req *http.Request) {
	user, ok := auth.UserFromContext(req.Context())
	if !ok {
		if h.st != nil {
			u, _, _ := auth.LoadUserFromRequest(h.st, req)
			user, ok = u, u != nil
		}
	}
	if !ok || user == nil {
		http.Error(w, "Login required for Storm World", http.StatusUnauthorized)
		return
	}

	lobbyID := NormalizeLobbyID(req.URL.Query().Get("lobby"))
	room := h.getOrCreate(lobbyID)

	// Free a prior socket for this user first so reconnects aren't blocked by "full".
	h.disconnectUser(user.ID)
	if room.PlayerCount() >= room.maxPlayers && !room.hasUser(user.ID) {
		http.Error(w, "Lobby full — pick another shard", http.StatusServiceUnavailable)
		return
	}

	room.ServeWS(w, req)
}

func (h *Hub) disconnectUser(userID string) {
	h.mu.Lock()
	rooms := make([]*Room, 0, len(h.rooms))
	for _, r := range h.rooms {
		rooms = append(rooms, r)
	}
	h.mu.Unlock()
	for _, r := range rooms {
		r.KickUser(userID)
	}
}

// NormalizeLobbyID maps empty / junk to "main".
func NormalizeLobbyID(id string) string {
	id = strings.ToLower(strings.TrimSpace(id))
	if id == "" {
		return "main"
	}
	var b strings.Builder
	for _, r := range id {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			b.WriteRune(r)
		}
	}
	out := b.String()
	if out == "" || len(out) > 32 {
		return "main"
	}
	return out
}
