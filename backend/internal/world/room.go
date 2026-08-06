// Package world is the Phase 1 shared Storm Chaser room:
// server-authored drops/events, presence, craft helpers, and secure pickups.
package world

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"math"
	mrand "math/rand"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"github.com/saints-weatherwatch/backend/internal/auth"
	"github.com/saints-weatherwatch/backend/internal/loot"
	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

// Maine / St. John Valley expanded corridor (degrees).
var Bounds = struct{ MinLat, MaxLat, MinLng, MaxLng float64 }{
	MinLat: 44.6, MaxLat: 47.5, MinLng: -71.2, MaxLng: -66.9,
}

const (
	PickupRadiusDeg  = 0.04
	MaxMoveDegPerSec = 0.25
	MaxDrops         = 40
	DropRespawnEvery = 18 * time.Second
	EventEvery       = 90 * time.Second
)

type ItemDef struct {
	Key    string `json:"key"`
	Name   string `json:"name"`
	Blurb  string `json:"blurb"`
	Rarity string `json:"rarity"`
	Kind   string `json:"kind"` // material | gear | trophy
	XP     int    `json:"xp"`
}

type Recipe struct {
	ID       string      `json:"id"`
	Name     string      `json:"name"`
	Blurb    string      `json:"blurb"`
	Inputs   []StackNeed `json:"inputs"`
	Output   StackNeed   `json:"output"`
	MinLevel int         `json:"minLevel"`
}

type StackNeed struct {
	Key string `json:"key"`
	Qty int    `json:"qty"`
}

var ItemCatalog = []ItemDef{
	{Key: "scrap_metal", Name: "Scrap Metal", Blurb: "Roadside steel scraps.", Rarity: "common", Kind: "material", XP: 2},
	{Key: "wiring", Name: "Wiring", Blurb: "Copper strands from a ditch box.", Rarity: "common", Kind: "material", XP: 2},
	{Key: "battery", Name: "Battery", Blurb: "Still has some charge.", Rarity: "common", Kind: "material", XP: 3},
	{Key: "plastic_parts", Name: "Plastic Parts", Blurb: "Housings and clips.", Rarity: "common", Kind: "material", XP: 2},
	{Key: "fuel_can", Name: "Fuel Can", Blurb: "A little go-juice.", Rarity: "uncommon", Kind: "material", XP: 5},
	{Key: "camera_parts", Name: "Camera Parts", Blurb: "Lens bits for storm shots.", Rarity: "uncommon", Kind: "material", XP: 6},
	{Key: "gps_module", Name: "GPS Module", Blurb: "Still locks satellites.", Rarity: "uncommon", Kind: "material", XP: 8},
	{Key: "radio_parts", Name: "Radio Parts", Blurb: "Coils and a cracked PCB.", Rarity: "uncommon", Kind: "material", XP: 7},
	{Key: "blueprint_frag", Name: "Blueprint Fragment", Blurb: "Half a probe schematic.", Rarity: "rare", Kind: "material", XP: 15},
	{Key: "advanced_sensor", Name: "Advanced Sensor", Blurb: "Lab-grade pickup.", Rarity: "rare", Kind: "material", XP: 20},
	{Key: "basic_probe", Name: "Basic Probe", Blurb: "Crafted field probe.", Rarity: "uncommon", Kind: "gear", XP: 0},
	{Key: "repair_kit", Name: "Repair Kit", Blurb: "Tape, ties, hope.", Rarity: "common", Kind: "gear", XP: 0},
	{Key: "storm_photo", Name: "Storm Photo", Blurb: "Shelf cloud snapshot.", Rarity: "uncommon", Kind: "trophy", XP: 10},
	{Key: "radar_core", Name: "Radar Core Ping", Blurb: "A bright blob on the scope.", Rarity: "common", Kind: "trophy", XP: 5},
}

var Recipes = []Recipe{
	{
		ID: "craft_repair_kit", Name: "Repair Kit", Blurb: "Keep the chase truck rolling.",
		Inputs: []StackNeed{{Key: "scrap_metal", Qty: 2}, {Key: "wiring", Qty: 1}},
		Output: StackNeed{Key: "repair_kit", Qty: 1}, MinLevel: 1,
	},
	{
		ID: "craft_basic_probe", Name: "Basic Probe", Blurb: "Deployable starter sensor.",
		Inputs: []StackNeed{{Key: "scrap_metal", Qty: 3}, {Key: "battery", Qty: 1}, {Key: "plastic_parts", Qty: 2}},
		Output: StackNeed{Key: "basic_probe", Qty: 1}, MinLevel: 2,
	},
	{
		ID: "craft_camera_rig", Name: "Storm Photo Kit", Blurb: "Turn parts into a trophy shot.",
		Inputs: []StackNeed{{Key: "camera_parts", Qty: 2}, {Key: "battery", Qty: 1}},
		Output: StackNeed{Key: "storm_photo", Qty: 1}, MinLevel: 1,
	},
}

var itemByKey map[string]ItemDef
var recipeByID map[string]Recipe
var dropWeights []string

func init() {
	itemByKey = map[string]ItemDef{}
	for _, d := range ItemCatalog {
		itemByKey[d.Key] = d
	}
	recipeByID = map[string]Recipe{}
	for _, r := range Recipes {
		recipeByID[r.ID] = r
	}
	for _, d := range ItemCatalog {
		if d.Kind != "material" {
			continue
		}
		n := 1
		switch d.Rarity {
		case "common":
			n = 5
		case "uncommon":
			n = 2
		case "rare":
			n = 1
		}
		for i := 0; i < n; i++ {
			dropWeights = append(dropWeights, d.Key)
		}
	}
}

func LookupItem(key string) (ItemDef, bool) {
	d, ok := itemByKey[key]
	return d, ok
}

func LookupRecipe(id string) (Recipe, bool) {
	r, ok := recipeByID[id]
	return r, ok
}

type Drop struct {
	ID      string  `json:"id"`
	ItemKey string  `json:"itemKey"`
	Name    string  `json:"name"`
	Rarity  string  `json:"rarity"`
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
}

type Player struct {
	UserID     string  `json:"userId"`
	ChaserName string  `json:"chaserName"`
	VehicleKey string  `json:"vehicleKey"`
	Lat        float64 `json:"lat"`
	Lng        float64 `json:"lng"`
	UpdatedAt  int64   `json:"updatedAt"`
}

type SimEvent struct {
	ID        string  `json:"id"`
	Label     string  `json:"label"`
	Blurb     string  `json:"blurb"`
	Simulated bool    `json:"simulated"` // always true
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	RewardKey string  `json:"rewardKey"`
	Active    bool    `json:"active"`
}

type Envelope struct {
	Type    string    `json:"type"`
	Players []Player  `json:"players,omitempty"`
	Drops   []Drop    `json:"drops,omitempty"`
	DropID  string    `json:"dropId,omitempty"`
	Event   *SimEvent `json:"event,omitempty"`
	Toast   string    `json:"toast,omitempty"`
	You     *Player   `json:"you,omitempty"`
}

type clientMsg struct {
	Type    string  `json:"type"`
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
	DropID  string  `json:"dropId"`
	EventID string  `json:"eventId"`
}

type client struct {
	room     *Room
	conn     *websocket.Conn
	send     chan []byte
	userID   string
	name     string
	veh      string
	lat      float64
	lng      float64
	lastMove time.Time
}

// Room is the single shared Phase 1 world instance.
type Room struct {
	st         *store.Store
	mu         sync.Mutex
	clients    map[*client]struct{}
	drops      map[string]*Drop
	event      *SimEvent
	origins    map[string]struct{}
	upgrader   websocket.Upgrader
	broadcast  chan []byte
	register   chan *client
	unregister chan *client
}

func NewRoom(st *store.Store, allowedOrigins []string) *Room {
	origins := map[string]struct{}{}
	for _, o := range allowedOrigins {
		o = strings.TrimSpace(o)
		if o != "" {
			origins[o] = struct{}{}
		}
	}
	r := &Room{
		st:         st,
		clients:    map[*client]struct{}{},
		drops:      map[string]*Drop{},
		origins:    origins,
		broadcast:  make(chan []byte, 32),
		register:   make(chan *client),
		unregister: make(chan *client),
	}
	r.upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(req *http.Request) bool {
			origin := req.Header.Get("Origin")
			if origin == "" || len(r.origins) == 0 {
				return true
			}
			_, ok := r.origins[origin]
			return ok
		},
	}
	return r
}

func (r *Room) Run(done <-chan struct{}) {
	dropTick := time.NewTicker(DropRespawnEvery)
	eventTick := time.NewTicker(EventEvery)
	defer dropTick.Stop()
	defer eventTick.Stop()
	r.ensureDropsLocked(12)

	for {
		select {
		case <-done:
			r.mu.Lock()
			for c := range r.clients {
				close(c.send)
				_ = c.conn.Close()
				delete(r.clients, c)
			}
			r.mu.Unlock()
			return
		case c := <-r.register:
			r.mu.Lock()
			r.clients[c] = struct{}{}
			r.mu.Unlock()
			r.sendSnapshot(c)
			r.broadcastPresence()
		case c := <-r.unregister:
			r.mu.Lock()
			if _, ok := r.clients[c]; ok {
				delete(r.clients, c)
				close(c.send)
			}
			r.mu.Unlock()
			r.broadcastPresence()
		case msg := <-r.broadcast:
			r.mu.Lock()
			for c := range r.clients {
				select {
				case c.send <- msg:
				default:
					go func(cl *client) { r.unregister <- cl }(c)
				}
			}
			r.mu.Unlock()
		case <-dropTick.C:
			r.mu.Lock()
			before := len(r.drops)
			r.ensureDropsLocked(MaxDrops)
			changed := len(r.drops) != before
			r.mu.Unlock()
			if changed {
				r.broadcastDrops()
			}
		case <-eventTick.C:
			r.maybeSpawnEvent()
		}
	}
}

func (r *Room) ServeWS(w http.ResponseWriter, req *http.Request) {
	user, ok := auth.UserFromContext(req.Context())
	if !ok {
		// Try cookie load if middleware missed (WS outside some groups).
		if r.st != nil {
			u, _, _ := auth.LoadUserFromRequest(r.st, req)
			user, ok = u, u != nil
		}
	}
	if !ok || user == nil {
		http.Error(w, "Login required for Storm World", http.StatusUnauthorized)
		return
	}
	conn, err := r.upgrader.Upgrade(w, req, nil)
	if err != nil {
		log.Printf("world.Room: upgrade: %v", err)
		return
	}
	c := &client{
		room:     r,
		conn:     conn,
		send:     make(chan []byte, 16),
		userID:   user.ID,
		name:     user.ChaserName,
		veh:      user.EquippedVehicleKey,
		lat:      47.05,
		lng:      -68.35,
		lastMove: time.Now(),
	}
	r.register <- c
	go c.writePump()
	go c.readPump()
}

func (c *client) readPump() {
	defer func() {
		c.room.unregister <- c
		_ = c.conn.Close()
	}()
	_ = c.conn.SetReadDeadline(time.Now().Add(90 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(90 * time.Second))
		return nil
	})
	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		var msg clientMsg
		if json.Unmarshal(data, &msg) != nil {
			continue
		}
		switch msg.Type {
		case "hello", "move":
			c.handleMove(msg.Lat, msg.Lng)
		case "pickup":
			c.room.handlePickup(c, msg.DropID)
		case "event_place":
			c.room.handleEventPlace(c, msg.EventID)
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

func (c *client) handleMove(lat, lng float64) {
	now := time.Now()
	dt := now.Sub(c.lastMove).Seconds()
	if dt < 0.05 {
		return
	}
	if dt > 2 {
		dt = 2
	}
	maxStep := MaxMoveDegPerSec * dt
	dlat := lat - c.lat
	dlng := lng - c.lng
	dist := math.Hypot(dlat, dlng)
	if dist > maxStep && dist > 0 {
		scale := maxStep / dist
		lat = c.lat + dlat*scale
		lng = c.lng + dlng*scale
	}
	c.lat = clamp(lat, Bounds.MinLat, Bounds.MaxLat)
	c.lng = clamp(lng, Bounds.MinLng, Bounds.MaxLng)
	c.lastMove = now
	c.room.broadcastPresence()
}

func (r *Room) handlePickup(c *client, dropID string) {
	if c.userID == "" || dropID == "" || r.st == nil {
		return
	}
	r.mu.Lock()
	d, ok := r.drops[dropID]
	if !ok {
		r.mu.Unlock()
		r.toast(c, "That drop is gone.")
		return
	}
	if math.Hypot(d.Lat-c.lat, d.Lng-c.lng) > PickupRadiusDeg {
		r.mu.Unlock()
		r.toast(c, "Too far — drive closer.")
		return
	}
	itemKey := d.ItemKey
	delete(r.drops, dropID)
	r.mu.Unlock()

	if !GrantStackOK(r.st, context.Background(), c.userID, itemKey, 1) {
		r.mu.Lock()
		r.drops[dropID] = d // rollback into world
		r.mu.Unlock()
		r.toast(c, "Could not bag item.")
		r.broadcastDrops()
		return
	}
	r.publish(Envelope{Type: "drop_gone", DropID: dropID})
	r.toast(c, "Bagged "+d.Name)
	r.broadcastDrops()
}

func (r *Room) handleEventPlace(c *client, eventID string) {
	r.mu.Lock()
	ev := r.event
	if ev == nil || !ev.Active || ev.ID != eventID {
		r.mu.Unlock()
		r.toast(c, "Event already claimed or expired.")
		return
	}
	if math.Hypot(ev.Lat-c.lat, ev.Lng-c.lng) > PickupRadiusDeg*1.4 {
		r.mu.Unlock()
		r.toast(c, "Get closer to place your marker.")
		return
	}
	reward := ev.RewardKey
	label := ev.Label
	ev.Active = false
	r.event = ev
	r.mu.Unlock()

	_ = GrantStack(r.st, context.Background(), c.userID, reward, 1)
	r.publish(Envelope{Type: "event_done", Event: ev, Toast: c.name + " secured: " + label})
	r.toast(c, "Event secured — reward bagged.")
}

func (r *Room) maybeSpawnEvent() {
	r.mu.Lock()
	if r.event != nil && r.event.Active {
		r.mu.Unlock()
		return
	}
	if mrand.Float64() > 0.55 {
		r.mu.Unlock()
		return
	}
	lat, lng := randomPoint()
	ev := &SimEvent{
		ID:        newID(),
		Label:     "SIMULATED · Lost Research Convoy",
		Blurb:     "Gameplay only — not real weather. Place a probe marker to secure surplus parts.",
		Simulated: true,
		Lat:       lat,
		Lng:       lng,
		RewardKey: "blueprint_frag",
		Active:    true,
	}
	r.event = ev
	r.mu.Unlock()
	r.publish(Envelope{Type: "event", Event: ev})
}

func (r *Room) ensureDropsLocked(target int) {
	for len(r.drops) < target {
		key := dropWeights[mrand.Intn(len(dropWeights))]
		def := itemByKey[key]
		lat, lng := randomPoint()
		id := newID()
		r.drops[id] = &Drop{ID: id, ItemKey: key, Name: def.Name, Rarity: def.Rarity, Lat: lat, Lng: lng}
	}
}

func (r *Room) sendSnapshot(c *client) {
	r.mu.Lock()
	players := r.playerListLocked()
	drops := r.dropListLocked()
	ev := r.event
	you := Player{UserID: c.userID, ChaserName: c.name, VehicleKey: c.veh, Lat: c.lat, Lng: c.lng, UpdatedAt: time.Now().Unix()}
	r.mu.Unlock()
	env := Envelope{Type: "snapshot", Players: players, Drops: drops, Event: ev, You: &you}
	if b, err := json.Marshal(env); err == nil {
		select {
		case c.send <- b:
		default:
		}
	}
}

func (r *Room) broadcastPresence() {
	r.mu.Lock()
	players := r.playerListLocked()
	r.mu.Unlock()
	r.publish(Envelope{Type: "presence", Players: players})
}

func (r *Room) broadcastDrops() {
	r.mu.Lock()
	drops := r.dropListLocked()
	r.mu.Unlock()
	r.publish(Envelope{Type: "drops", Drops: drops})
}

func (r *Room) playerListLocked() []Player {
	out := make([]Player, 0, len(r.clients))
	now := time.Now().Unix()
	for c := range r.clients {
		out = append(out, Player{
			UserID: c.userID, ChaserName: c.name, VehicleKey: c.veh,
			Lat: c.lat, Lng: c.lng, UpdatedAt: now,
		})
	}
	return out
}

func (r *Room) dropListLocked() []Drop {
	out := make([]Drop, 0, len(r.drops))
	for _, d := range r.drops {
		out = append(out, *d)
	}
	return out
}

func (r *Room) toast(c *client, msg string) {
	if b, err := json.Marshal(Envelope{Type: "toast", Toast: msg}); err == nil {
		select {
		case c.send <- b:
		default:
		}
	}
}

func (r *Room) publish(env Envelope) {
	b, err := json.Marshal(env)
	if err != nil {
		return
	}
	select {
	case r.broadcast <- b:
	default:
		log.Printf("world.Room: broadcast full, drop %s", env.Type)
	}
}

func randomPoint() (lat, lng float64) {
	lat = Bounds.MinLat + mrand.Float64()*(Bounds.MaxLat-Bounds.MinLat)
	lng = Bounds.MinLng + mrand.Float64()*(Bounds.MaxLng-Bounds.MinLng)
	return
}

func clamp(v, lo, hi float64) float64 {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

// GrantStack adds qty of any known world/loot item to inventory.
func GrantStack(st *store.Store, ctx context.Context, userID, key string, qty int) error {
	if st == nil || userID == "" || qty <= 0 {
		return nil
	}
	if _, ok := LookupItem(key); !ok {
		if _, ok2 := loot.Lookup(key); !ok2 {
			return errUnknownItem
		}
	}
	existing, err := st.Client.UserCollectible.FindUnique(
		db.UserCollectible.UserIDItemKey(
			db.UserCollectible.UserID.Equals(userID),
			db.UserCollectible.ItemKey.Equals(key),
		),
	).Exec(ctx)
	if err == nil && existing != nil {
		_, err = st.Client.UserCollectible.FindUnique(
			db.UserCollectible.UserIDItemKey(
				db.UserCollectible.UserID.Equals(userID),
				db.UserCollectible.ItemKey.Equals(key),
			),
		).Update(
			db.UserCollectible.Count.Increment(qty),
			db.UserCollectible.UpdatedAt.Set(time.Now().UTC()),
		).Exec(ctx)
		return err
	}
	_, err = st.Client.UserCollectible.CreateOne(
		db.UserCollectible.ItemKey.Set(key),
		db.UserCollectible.User.Link(db.User.ID.Equals(userID)),
		db.UserCollectible.Count.Set(qty),
	).Exec(ctx)
	return err
}

func GrantStackOK(st *store.Store, ctx context.Context, userID, key string, qty int) bool {
	return GrantStack(st, ctx, userID, key, qty) == nil
}

func newID() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

// ConsumeStack removes qty if available. Returns false if insufficient.
func ConsumeStack(st *store.Store, ctx context.Context, userID, key string, qty int) bool {
	if st == nil || userID == "" || qty <= 0 {
		return false
	}
	row, err := st.Client.UserCollectible.FindUnique(
		db.UserCollectible.UserIDItemKey(
			db.UserCollectible.UserID.Equals(userID),
			db.UserCollectible.ItemKey.Equals(key),
		),
	).Exec(ctx)
	if err != nil || row == nil || row.Count < qty {
		return false
	}
	left := row.Count - qty
	if left <= 0 {
		_, err = st.Client.UserCollectible.FindUnique(
			db.UserCollectible.UserIDItemKey(
				db.UserCollectible.UserID.Equals(userID),
				db.UserCollectible.ItemKey.Equals(key),
			),
		).Delete().Exec(ctx)
		return err == nil
	}
	_, err = st.Client.UserCollectible.FindUnique(
		db.UserCollectible.UserIDItemKey(
			db.UserCollectible.UserID.Equals(userID),
			db.UserCollectible.ItemKey.Equals(key),
		),
	).Update(
		db.UserCollectible.Count.Set(left),
		db.UserCollectible.UpdatedAt.Set(time.Now().UTC()),
	).Exec(ctx)
	return err == nil
}

func StackCount(st *store.Store, ctx context.Context, userID, key string) int {
	row, err := st.Client.UserCollectible.FindUnique(
		db.UserCollectible.UserIDItemKey(
			db.UserCollectible.UserID.Equals(userID),
			db.UserCollectible.ItemKey.Equals(key),
		),
	).Exec(ctx)
	if err != nil || row == nil {
		return 0
	}
	return row.Count
}

var errUnknownItem = errString("unknown item")

type errString string

func (e errString) Error() string { return string(e) }
