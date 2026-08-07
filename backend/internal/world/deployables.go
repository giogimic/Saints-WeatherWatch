package world

import (
	"context"
	"log"
	"math"
	"time"

	"github.com/saints-weatherwatch/backend/internal/nws"
	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

// ── Deployable kind catalog ─────────────────────────────────────────────────

const (
	MaxDeployablesPerUser = 5
	DeployTickEvery       = 60 * time.Second
	AlertProximityDeg     = 0.6 // ~40 mi at Maine latitudes
	YieldTickMinutes      = 5
	MaxYieldStored        = 50
)

// DeployKind defines a type of field-deployable equipment.
type DeployKind struct {
	Key          string  `json:"key"`
	Name         string  `json:"name"`
	Blurb        string  `json:"blurb"`
	LifetimeH    float64 `json:"lifetimeH"`    // hours until expiry without refuel
	FuelDrainPH  int     `json:"fuelDrainPH"`  // fuel drain per hour (0–100 scale)
	HealthDecayH int     `json:"healthDecayPH"` // health decay per hour
	YieldKey     string  `json:"yieldKey"`
	YieldPerTick int     `json:"yieldPerTick"` // per YieldTickMinutes near an alert
	BonusKey     string  `json:"bonusKey,omitempty"`
	BonusTick    int     `json:"bonusTick,omitempty"` // minutes between bonus yields
	ConsumeItems []StackNeed `json:"consumeItems"`
	MinLevel     int     `json:"minLevel"`
	Value        int     `json:"value"` // Storm Credits value for economy
}

var DeployKinds = []DeployKind{
	{
		Key: "basic_probe", Name: "Basic Probe", Blurb: "Starter field sensor. Short-lived.",
		LifetimeH: 4, FuelDrainPH: 25, HealthDecayH: 5, YieldKey: "research_sample", YieldPerTick: 1,
		ConsumeItems: []StackNeed{{Key: "basic_probe", Qty: 1}},
		MinLevel: 2, Value: 35,
	},
	{
		Key: "solar_probe", Name: "Solar Probe", Blurb: "Self-powered probe. Lasts longer.",
		LifetimeH: 8, FuelDrainPH: 12, HealthDecayH: 3, YieldKey: "research_sample", YieldPerTick: 1,
		BonusKey: "scientific_note", BonusTick: 30,
		ConsumeItems: []StackNeed{{Key: "basic_probe", Qty: 1}, {Key: "solar_pack", Qty: 1}},
		MinLevel: 3, Value: 85,
	},
	{
		Key: "weather_station", Name: "Weather Station", Blurb: "Full deployable station. High yield.",
		LifetimeH: 12, FuelDrainPH: 8, HealthDecayH: 2, YieldKey: "research_sample", YieldPerTick: 2,
		BonusKey: "weather_journal", BonusTick: 30,
		ConsumeItems: []StackNeed{{Key: "basic_probe", Qty: 2}, {Key: "solar_pack", Qty: 1}, {Key: "advanced_sensor", Qty: 1}},
		MinLevel: 5, Value: 200,
	},
}

var deployKindByKey map[string]DeployKind

func init() {
	deployKindByKey = map[string]DeployKind{}
	for _, dk := range DeployKinds {
		deployKindByKey[dk.Key] = dk
	}
}

func LookupDeployKind(key string) (DeployKind, bool) {
	dk, ok := deployKindByKey[key]
	return dk, ok
}

// ── DeployableView is the API / WS shape ────────────────────────────────────

type DeployableView struct {
	ID          string  `json:"id"`
	UserID      string  `json:"userId"`
	Kind        string  `json:"kind"`
	KindName    string  `json:"kindName"`
	Label       string  `json:"label"`
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
	Health      int     `json:"health"`
	Fuel        int     `json:"fuel"`
	Public      bool    `json:"public"`
	YieldKey    string  `json:"yieldKey"`
	YieldStored int     `json:"yieldStored"`
	PlacedAt    string  `json:"placedAt"`
	ExpiresAt   string  `json:"expiresAt"`
}

func viewFromRow(row *db.DeployableModel) DeployableView {
	kindName := row.Kind
	if dk, ok := LookupDeployKind(row.Kind); ok {
		kindName = dk.Name
	}
	return DeployableView{
		ID: row.ID, UserID: row.UserID, Kind: row.Kind, KindName: kindName,
		Label: row.Label, Lat: row.Lat, Lng: row.Lng,
		Health: row.Health, Fuel: row.Fuel, Public: row.Public,
		YieldKey: row.YieldKey, YieldStored: row.YieldStored,
		PlacedAt:  row.PlacedAt.UTC().Format(time.RFC3339),
		ExpiresAt: row.ExpiresAt.UTC().Format(time.RFC3339),
	}
}

// ── Core operations ─────────────────────────────────────────────────────────

// PlaceDeployable consumes the required gear items and places a new entity.
func PlaceDeployable(st *store.Store, ctx context.Context, userID, kind, label string, lat, lng float64, public bool) (*DeployableView, error) {
	dk, ok := LookupDeployKind(kind)
	if !ok {
		return nil, errString("unknown deployable kind")
	}
	// Bounds check
	if lat < Bounds.MinLat || lat > Bounds.MaxLat || lng < Bounds.MinLng || lng > Bounds.MaxLng {
		return nil, errString("outside world bounds")
	}
	// Count existing
	existing, err := st.Client.Deployable.FindMany(
		db.Deployable.UserID.Equals(userID),
	).Exec(ctx)
	if err != nil {
		return nil, err
	}
	if len(existing) >= MaxDeployablesPerUser {
		return nil, errString("max deployables reached")
	}
	// Verify inventory
	for _, need := range dk.ConsumeItems {
		if StackCount(st, ctx, userID, need.Key) < need.Qty {
			return nil, errString("missing material: " + need.Key)
		}
	}
	// Consume items
	for _, need := range dk.ConsumeItems {
		if !ConsumeStack(st, ctx, userID, need.Key, need.Qty) {
			return nil, errString("failed to consume: " + need.Key)
		}
	}
	// Create deployable
	now := time.Now().UTC()
	expiresAt := now.Add(time.Duration(dk.LifetimeH * float64(time.Hour)))
	if label == "" {
		label = dk.Name
	}
	row, err := st.Client.Deployable.CreateOne(
		db.Deployable.Kind.Set(kind),
		db.Deployable.Lat.Set(lat),
		db.Deployable.Lng.Set(lng),
		db.Deployable.ExpiresAt.Set(expiresAt),
		db.Deployable.User.Link(db.User.ID.Equals(userID)),
		db.Deployable.Label.Set(label),
		db.Deployable.Public.Set(public),
		db.Deployable.YieldKey.Set(dk.YieldKey),
		db.Deployable.Health.Set(100),
		db.Deployable.Fuel.Set(100),
		db.Deployable.YieldStored.Set(0),
		db.Deployable.LastCollect.Set(now),
		db.Deployable.PlacedAt.Set(now),
	).Exec(ctx)
	if err != nil {
		// Rollback consumed items
		for _, need := range dk.ConsumeItems {
			_ = GrantStack(st, ctx, userID, need.Key, need.Qty)
		}
		return nil, err
	}
	v := viewFromRow(row)
	return &v, nil
}

// CollectDeployable harvests accumulated yield. Owner or any player if public.
func CollectDeployable(st *store.Store, ctx context.Context, userID, deployableID string) (*DeployableView, int, error) {
	row, err := st.Client.Deployable.FindUnique(
		db.Deployable.ID.Equals(deployableID),
	).Exec(ctx)
	if err != nil || row == nil {
		return nil, 0, errString("deployable not found")
	}
	// Auth: owner or public
	if row.UserID != userID && !row.Public {
		return nil, 0, errString("not your deployable")
	}
	if row.YieldStored <= 0 {
		v := viewFromRow(row)
		return &v, 0, nil
	}
	qty := row.YieldStored
	if err := GrantStack(st, ctx, userID, row.YieldKey, qty); err != nil {
		return nil, 0, err
	}
	now := time.Now().UTC()
	updated, err := st.Client.Deployable.FindUnique(
		db.Deployable.ID.Equals(deployableID),
	).Update(
		db.Deployable.YieldStored.Set(0),
		db.Deployable.LastCollect.Set(now),
	).Exec(ctx)
	if err != nil {
		return nil, qty, err
	}
	v := viewFromRow(updated)
	return &v, qty, nil
}

// RefuelDeployable consumes a solar_pack or fuel_can and resets fuel to 100.
func RefuelDeployable(st *store.Store, ctx context.Context, userID, deployableID string) (*DeployableView, error) {
	row, err := st.Client.Deployable.FindUnique(
		db.Deployable.ID.Equals(deployableID),
	).Exec(ctx)
	if err != nil || row == nil {
		return nil, errString("deployable not found")
	}
	if row.UserID != userID {
		return nil, errString("not your deployable")
	}
	// Try solar_pack first, then fuel_can
	fuelItem := ""
	if ConsumeStack(st, ctx, userID, "solar_pack", 1) {
		fuelItem = "solar_pack"
	} else if ConsumeStack(st, ctx, userID, "fuel_can", 1) {
		fuelItem = "fuel_can"
	}
	if fuelItem == "" {
		return nil, errString("need a solar_pack or fuel_can")
	}
	// Reset fuel and extend expiry
	dk, _ := LookupDeployKind(row.Kind)
	now := time.Now().UTC()
	newExpiry := now.Add(time.Duration(dk.LifetimeH * float64(time.Hour)))
	updated, err := st.Client.Deployable.FindUnique(
		db.Deployable.ID.Equals(deployableID),
	).Update(
		db.Deployable.Fuel.Set(100),
		db.Deployable.ExpiresAt.Set(newExpiry),
	).Exec(ctx)
	if err != nil {
		// Rollback
		_ = GrantStack(st, ctx, userID, fuelItem, 1)
		return nil, err
	}
	v := viewFromRow(updated)
	return &v, nil
}

// RepairDeployable consumes a repair_kit and resets health to 100.
func RepairDeployable(st *store.Store, ctx context.Context, userID, deployableID string) (*DeployableView, error) {
	row, err := st.Client.Deployable.FindUnique(
		db.Deployable.ID.Equals(deployableID),
	).Exec(ctx)
	if err != nil || row == nil {
		return nil, errString("deployable not found")
	}
	if row.UserID != userID {
		return nil, errString("not your deployable")
	}
	if !ConsumeStack(st, ctx, userID, "repair_kit", 1) {
		return nil, errString("need a repair_kit")
	}
	updated, err := st.Client.Deployable.FindUnique(
		db.Deployable.ID.Equals(deployableID),
	).Update(
		db.Deployable.Health.Set(100),
	).Exec(ctx)
	if err != nil {
		_ = GrantStack(st, ctx, userID, "repair_kit", 1)
		return nil, err
	}
	v := viewFromRow(updated)
	return &v, nil
}

// RemoveDeployable lets the owner pick up their deployable. Returns partial salvage.
func RemoveDeployable(st *store.Store, ctx context.Context, userID, deployableID string) error {
	row, err := st.Client.Deployable.FindUnique(
		db.Deployable.ID.Equals(deployableID),
	).Exec(ctx)
	if err != nil || row == nil {
		return errString("deployable not found")
	}
	if row.UserID != userID {
		return errString("not your deployable")
	}
	// Collect any remaining yield first
	if row.YieldStored > 0 {
		_ = GrantStack(st, ctx, userID, row.YieldKey, row.YieldStored)
	}
	// Partial salvage: return scrap based on health
	if row.Health > 50 {
		_ = GrantStack(st, ctx, userID, "scrap_metal", 2)
	} else if row.Health > 0 {
		_ = GrantStack(st, ctx, userID, "scrap_metal", 1)
	}
	_, err = st.Client.Deployable.FindUnique(
		db.Deployable.ID.Equals(deployableID),
	).Delete().Exec(ctx)
	return err
}

// ListMyDeployables returns all active deployables for a user.
func ListMyDeployables(st *store.Store, ctx context.Context, userID string) []DeployableView {
	if st == nil {
		return nil
	}
	rows, err := st.Client.Deployable.FindMany(
		db.Deployable.UserID.Equals(userID),
	).OrderBy(db.Deployable.PlacedAt.Order(db.SortOrderDesc)).Exec(ctx)
	if err != nil {
		return nil
	}
	out := make([]DeployableView, 0, len(rows))
	for _, r := range rows {
		out = append(out, viewFromRow(&r))
	}
	return out
}

// ListNearbyDeployables returns deployables within a bounding box for map rendering.
func ListNearbyDeployables(st *store.Store, ctx context.Context, lat, lng, radiusDeg float64) []DeployableView {
	if st == nil {
		return nil
	}
	rows, err := st.Client.Deployable.FindMany(
		db.Deployable.Lat.Gte(lat-radiusDeg),
		db.Deployable.Lat.Lte(lat+radiusDeg),
		db.Deployable.Lng.Gte(lng-radiusDeg),
		db.Deployable.Lng.Lte(lng+radiusDeg),
	).Take(100).Exec(ctx)
	if err != nil {
		return nil
	}
	out := make([]DeployableView, 0, len(rows))
	for _, r := range rows {
		out = append(out, viewFromRow(&r))
	}
	return out
}

// ── Tick — decay, yield, expire ─────────────────────────────────────────────

// TickDeployables decays fuel/health, generates yield near alerts, and removes expired ones.
func TickDeployables(st *store.Store, ctx context.Context, nwsCache *nws.Cache) {
	if st == nil {
		return
	}
	now := time.Now().UTC()

	// 1. Delete expired deployables
	expired, err := st.Client.Deployable.FindMany(
		db.Deployable.ExpiresAt.Before(now),
	).Exec(ctx)
	if err == nil {
		for _, e := range expired {
			log.Printf("world.deployable expired id=%s kind=%s user=%s", e.ID, e.Kind, e.UserID)
			_, _ = st.Client.Deployable.FindUnique(
				db.Deployable.ID.Equals(e.ID),
			).Delete().Exec(ctx)
		}
	}

	// 2. Process active deployables: decay + yield
	rows, err := st.Client.Deployable.FindMany().Exec(ctx)
	if err != nil {
		return
	}

	// Get active alert polygons for proximity checks
	var alertPoints [][2]float64
	if nwsCache != nil {
		resp := nwsCache.Get()
		for _, a := range resp.Alerts {
			if lat, lng, ok := nws.AlertCentroid(a); ok {
				alertPoints = append(alertPoints, [2]float64{lat, lng})
			}
		}
	}

	for _, row := range rows {
		dk, ok := LookupDeployKind(row.Kind)
		if !ok {
			continue
		}

		// Decay fuel (per minute, scaled from per-hour rate)
		fuelDrain := dk.FuelDrainPH / 60
		if fuelDrain < 1 {
			fuelDrain = 1
		}
		newFuel := row.Fuel - fuelDrain
		if newFuel < 0 {
			newFuel = 0
		}

		// Decay health (per minute, scaled from per-hour rate)
		healthDecay := dk.HealthDecayH / 60
		if healthDecay < 1 && now.Minute()%10 == 0 {
			healthDecay = 1 // At least 1 per 10 min for slow-decay kinds
		}
		newHealth := row.Health - healthDecay
		if newHealth < 0 {
			newHealth = 0
		}

		// Generate yield if near an active alert and has fuel
		yieldGain := 0
		if newFuel > 0 && newHealth > 0 {
			nearAlert := false
			for _, ap := range alertPoints {
				dist := math.Hypot(row.Lat-ap[0], row.Lng-ap[1])
				if dist <= AlertProximityDeg {
					nearAlert = true
					break
				}
			}
			if nearAlert {
				yieldGain = dk.YieldPerTick
			}
		}
		newYield := row.YieldStored + yieldGain
		if newYield > MaxYieldStored {
			newYield = MaxYieldStored
		}

		// Check bonus yield
		if dk.BonusKey != "" && dk.BonusTick > 0 && newFuel > 0 && newHealth > 0 {
			minutesSincePlaced := int(now.Sub(row.PlacedAt).Minutes())
			if minutesSincePlaced > 0 && minutesSincePlaced%dk.BonusTick == 0 {
				_ = GrantStack(st, ctx, row.UserID, dk.BonusKey, 1)
			}
		}

		// Update
		_, err := st.Client.Deployable.FindUnique(
			db.Deployable.ID.Equals(row.ID),
		).Update(
			db.Deployable.Fuel.Set(newFuel),
			db.Deployable.Health.Set(newHealth),
			db.Deployable.YieldStored.Set(newYield),
		).Exec(ctx)
		if err != nil {
			log.Printf("world.deployable tick failed id=%s: %v", row.ID, err)
		}

		// Auto-expire if both fuel and health are 0
		if newFuel <= 0 && newHealth <= 0 {
			log.Printf("world.deployable dead id=%s kind=%s user=%s", row.ID, row.Kind, row.UserID)
			_, _ = st.Client.Deployable.FindUnique(
				db.Deployable.ID.Equals(row.ID),
			).Delete().Exec(ctx)
		}
	}
}

// DeployableCount returns how many active deployables a player has.
func DeployableCount(st *store.Store, ctx context.Context, userID string) int {
	if st == nil {
		return 0
	}
	rows, err := st.Client.Deployable.FindMany(
		db.Deployable.UserID.Equals(userID),
	).Exec(ctx)
	if err != nil {
		return MaxDeployablesPerUser
	}
	return len(rows)
}
