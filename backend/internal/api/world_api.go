package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/saints-weatherwatch/backend/internal/auth"
	"github.com/saints-weatherwatch/backend/internal/loot"
	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
	"github.com/saints-weatherwatch/backend/internal/world"
)

func mountWorldRoutes(r chi.Router, st *store.Store, hub *world.Hub) {
	r.Get("/world/catalog", worldCatalogHandler())
	r.Get("/world/lobbies", worldLobbiesHandler(hub))
	r.Get("/world/inventory", worldInventoryHandler(st))
	r.Get("/world/research", worldResearchHandler(st))
	r.Get("/world/wallet", worldWalletHandler(st))
	r.Get("/world/vendor", worldVendorCatalogHandler())
	r.Post("/world/vendor/sell", worldVendorSellHandler(st))
	r.Post("/world/vendor/buy", worldVendorBuyHandler(st))
	r.Post("/world/craft", worldCraftHandler(st))
	r.Get("/world/trades", worldTradesHandler(st))
	r.Post("/world/trades", worldCreateTradeHandler(st))
	r.Post("/world/trades/{id}/buy", worldBuyTradeHandler(st))
	r.Delete("/world/trades/{id}", worldCancelTradeHandler(st))
	// Phase 5 — deployables
	r.Get("/world/deployables", worldMyDeployablesHandler(st))
	r.Get("/world/deployables/nearby", worldNearbyDeployablesHandler(st))
	r.Get("/world/deployables/kinds", worldDeployKindsHandler())
	r.Post("/world/deployables", worldPlaceDeployableHandler(st))
	r.Post("/world/deployables/{id}/collect", worldCollectDeployableHandler(st))
	r.Post("/world/deployables/{id}/refuel", worldRefuelDeployableHandler(st))
	r.Post("/world/deployables/{id}/repair", worldRepairDeployableHandler(st))
	r.Delete("/world/deployables/{id}", worldRemoveDeployableHandler(st))
}

func worldLobbiesHandler(hub *world.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		list := []world.LobbyStatus{}
		if hub != nil {
			list = hub.ListLobbies()
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"lobbies": list,
			"zones":   world.ZoneCatalog,
		})
	}
}

func worldCatalogHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"items":   world.CatalogWithValues(),
			"recipes": world.Recipes,
			"bounds": map[string]float64{
				"minLat": world.Bounds.MinLat, "maxLat": world.Bounds.MaxLat,
				"minLng": world.Bounds.MinLng, "maxLng": world.Bounds.MaxLng,
			},
			"loot":   loot.Catalog,
			"zones":  world.ZoneCatalog,
			"vendor": world.VendorCatalog(),
			"economy": map[string]any{
				"currency":       "Storm Credits",
				"starting":       world.StartingCredits,
				"vendorBuyRatio": world.VendorBuyRatio,
				"maxTradeQty":    world.MaxTradeOfferQty,
				"maxVendorQty":   world.MaxVendorQty,
			},
		})
	}
}

func worldInventoryHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		credits, _ := world.GetCredits(st, r.Context(), user.ID)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"stormCredits": credits,
			"items":        mergedInventory(st, r, user.ID),
		})
	}
}

func worldWalletHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		credits, err := world.GetCredits(st, r.Context(), user.ID)
		if err != nil {
			http.Error(w, "Wallet unavailable", http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"stormCredits": credits,
			"currency":     "Storm Credits",
		})
	}
}

func worldVendorCatalogHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"vendor": "Storm Market",
			"note":   "NPC vendor. Buys your scrap below base value; sells commons at list price.",
			"stock":  world.VendorCatalog(),
		})
	}
}

type vendorQtyReq struct {
	ItemKey string `json:"itemKey"`
	Qty     int    `json:"qty"`
}

func worldVendorSellHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		if ok, retry := world.AllowVendor(user.ID); !ok {
			world.WriteSlowDown(w, retry)
			return
		}
		var req vendorQtyReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.ItemKey) == "" {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}
		gain, bal, err := world.VendorSellFromPlayer(st, r.Context(), user.ID, req.ItemKey, req.Qty)
		if err != nil {
			writeVendorErr(w, err)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok": true, "creditsGained": gain, "stormCredits": bal,
			"inventory": mergedInventory(st, r, user.ID),
		})
	}
}

func worldVendorBuyHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		if ok, retry := world.AllowVendor(user.ID); !ok {
			world.WriteSlowDown(w, retry)
			return
		}
		var req vendorQtyReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.ItemKey) == "" {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}
		spent, bal, err := world.VendorBuyToPlayer(st, r.Context(), user.ID, req.ItemKey, req.Qty)
		if err != nil {
			writeVendorErr(w, err)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok": true, "creditsSpent": spent, "stormCredits": bal,
			"inventory": mergedInventory(st, r, user.ID),
		})
	}
}

func writeVendorErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, world.ErrInsufficientCredits):
		http.Error(w, "Not enough Storm Credits", http.StatusConflict)
	case errors.Is(err, world.ErrInsufficientItems):
		http.Error(w, "Not enough items", http.StatusConflict)
	case errors.Is(err, world.ErrNotVendorStock):
		http.Error(w, "Vendor does not sell that item", http.StatusBadRequest)
	case errors.Is(err, world.ErrUnknownItem):
		http.Error(w, "Unknown item", http.StatusBadRequest)
	case errors.Is(err, world.ErrBadQty):
		http.Error(w, "Invalid quantity", http.StatusBadRequest)
	default:
		http.Error(w, "Vendor trade failed", http.StatusInternalServerError)
	}
}

func worldResearchHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		rows := world.ListResearchLog(st, r.Context(), user.ID, 40)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"generatedAt": time.Now().UTC().Format(time.RFC3339),
			"note":        "SIM research grants from time-on-station near live NWS alert cells. Official severity/text are never changed.",
			"items":       rows,
		})
	}
}

func mergedInventory(st *store.Store, r *http.Request, userID string) []map[string]any {
	out := []map[string]any{}
	if st == nil {
		return out
	}
	rows, err := st.Client.UserCollectible.FindMany(db.UserCollectible.UserID.Equals(userID)).Exec(r.Context())
	if err != nil {
		return out
	}
	for _, row := range rows {
		name, rarity, kind := row.ItemKey, "common", "material"
		if d, ok := world.LookupItem(row.ItemKey); ok {
			name, rarity, kind = d.Name, d.Rarity, d.Kind
		} else if d, ok := loot.Lookup(row.ItemKey); ok {
			name, rarity, kind = d.Name, d.Rarity, "trophy"
		}
		out = append(out, map[string]any{
			"key": row.ItemKey, "name": name, "rarity": rarity, "kind": kind, "count": row.Count,
			"value":      world.ItemValue(row.ItemKey),
			"vendorBuy":  world.VendorBuyPrice(row.ItemKey),
			"vendorSell": world.VendorSellPrice(row.ItemKey),
		})
	}
	return out
}

type craftReq struct {
	RecipeID string `json:"recipeId"`
}

func worldCraftHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		if ok, retry := world.AllowCraft(user.ID); !ok {
			world.WriteSlowDown(w, retry)
			return
		}
		var req craftReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.RecipeID) == "" {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}
		recipe, ok := world.LookupRecipe(req.RecipeID)
		if !ok {
			http.Error(w, "Unknown recipe", http.StatusBadRequest)
			return
		}
		if user.Level < recipe.MinLevel {
			http.Error(w, "Level too low for this recipe", http.StatusForbidden)
			return
		}
		for _, in := range recipe.Inputs {
			if world.StackCount(st, r.Context(), user.ID, in.Key) < in.Qty {
				http.Error(w, "Missing materials: "+in.Key, http.StatusConflict)
				return
			}
		}
		for _, in := range recipe.Inputs {
			if !world.ConsumeStack(st, r.Context(), user.ID, in.Key, in.Qty) {
				http.Error(w, "Craft failed while consuming "+in.Key, http.StatusConflict)
				return
			}
		}
		if err := world.GrantStack(st, r.Context(), user.ID, recipe.Output.Key, recipe.Output.Qty); err != nil {
			for _, in := range recipe.Inputs {
				_ = world.GrantStack(st, r.Context(), user.ID, in.Key, in.Qty)
			}
			http.Error(w, "Craft grant failed", http.StatusInternalServerError)
			return
		}
		credits, _ := world.GetCredits(st, r.Context(), user.ID)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok": true, "recipeId": recipe.ID, "output": recipe.Output,
			"stormCredits": credits,
			"inventory":    mergedInventory(st, r, user.ID),
		})
	}
}

type createTradeReq struct {
	OfferKey string `json:"offerKey"`
	OfferQty int    `json:"offerQty"`
	AskKey   string `json:"askKey"`
	AskQty   int    `json:"askQty"`
}

func worldTradesHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if st == nil {
			_ = json.NewEncoder(w).Encode([]any{})
			return
		}
		rows, err := st.Client.TradeListing.FindMany(
			db.TradeListing.Status.Equals("open"),
		).OrderBy(db.TradeListing.CreatedAt.Order(db.SortOrderDesc)).Take(50).Exec(r.Context())
		if err != nil {
			_ = json.NewEncoder(w).Encode([]any{})
			return
		}
		out := make([]map[string]any, 0, len(rows))
		for _, row := range rows {
			out = append(out, map[string]any{
				"id": row.ID, "sellerId": row.SellerID,
				"offerKey": row.OfferKey, "offerQty": row.OfferQty,
				"askKey": row.AskKey, "askQty": row.AskQty,
				"status": row.Status, "createdAt": row.CreatedAt.UTC().Format(time.RFC3339),
				"offerValue": world.ItemValue(row.OfferKey) * row.OfferQty,
				"askValue":   world.ItemValue(row.AskKey) * row.AskQty,
			})
		}
		_ = json.NewEncoder(w).Encode(out)
	}
}

func worldCreateTradeHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		if ok, retry := world.AllowTrade(user.ID); !ok {
			world.WriteSlowDown(w, retry)
			return
		}
		var req createTradeReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}
		if req.OfferQty < 1 || req.AskQty < 1 || req.OfferKey == "" || req.AskKey == "" || req.OfferKey == req.AskKey {
			http.Error(w, "Invalid trade", http.StatusBadRequest)
			return
		}
		if req.OfferQty > world.MaxTradeOfferQty || req.AskQty > world.MaxTradeOfferQty {
			http.Error(w, "Quantity too high", http.StatusBadRequest)
			return
		}
		if world.CountOpenListings(st, r.Context(), user.ID) >= world.MaxOpenListings {
			http.Error(w, "Too many open listings", http.StatusConflict)
			return
		}
		if _, ok := world.LookupItem(req.OfferKey); !ok {
			if _, ok2 := loot.Lookup(req.OfferKey); !ok2 {
				http.Error(w, "Unknown offer item", http.StatusBadRequest)
				return
			}
		}
		if _, ok := world.LookupItem(req.AskKey); !ok {
			if _, ok2 := loot.Lookup(req.AskKey); !ok2 {
				http.Error(w, "Unknown ask item", http.StatusBadRequest)
				return
			}
		}
		if !world.ConsumeStack(st, r.Context(), user.ID, req.OfferKey, req.OfferQty) {
			http.Error(w, "Not enough items to list", http.StatusConflict)
			return
		}
		row, err := st.Client.TradeListing.CreateOne(
			db.TradeListing.OfferKey.Set(req.OfferKey),
			db.TradeListing.OfferQty.Set(req.OfferQty),
			db.TradeListing.AskKey.Set(req.AskKey),
			db.TradeListing.AskQty.Set(req.AskQty),
			db.TradeListing.Seller.Link(db.User.ID.Equals(user.ID)),
			db.TradeListing.Status.Set("open"),
		).Exec(r.Context())
		if err != nil {
			_ = world.GrantStack(st, r.Context(), user.ID, req.OfferKey, req.OfferQty)
			http.Error(w, "Could not create listing", http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(row)
	}
}

func worldBuyTradeHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		if ok, retry := world.AllowTrade(user.ID); !ok {
			world.WriteSlowDown(w, retry)
			return
		}
		id := chi.URLParam(r, "id")
		listing, err := st.Client.TradeListing.FindUnique(db.TradeListing.ID.Equals(id)).Exec(r.Context())
		if err != nil || listing == nil || listing.Status != "open" {
			http.Error(w, "Listing not available", http.StatusNotFound)
			return
		}
		if listing.SellerID == user.ID {
			http.Error(w, "Cannot buy your own listing", http.StatusBadRequest)
			return
		}
		now := time.Now().UTC()
		claimed, err := st.Client.TradeListing.FindMany(
			db.TradeListing.ID.Equals(id),
			db.TradeListing.Status.Equals("open"),
		).Update(
			db.TradeListing.Status.Set("sold"),
			db.TradeListing.BuyerID.Set(user.ID),
			db.TradeListing.CompletedAt.Set(now),
		).Exec(r.Context())
		if err != nil || claimed == nil || claimed.Count != 1 {
			http.Error(w, "Listing not available", http.StatusConflict)
			return
		}
		if !world.ConsumeStack(st, r.Context(), user.ID, listing.AskKey, listing.AskQty) {
			_, _ = st.Client.TradeListing.FindUnique(db.TradeListing.ID.Equals(id)).Update(
				db.TradeListing.Status.Set("open"),
				db.TradeListing.BuyerID.SetOptional(nil),
				db.TradeListing.CompletedAt.SetOptional(nil),
			).Exec(r.Context())
			http.Error(w, "Missing ask items", http.StatusConflict)
			return
		}
		if err := world.GrantStack(st, r.Context(), user.ID, listing.OfferKey, listing.OfferQty); err != nil {
			_ = world.GrantStack(st, r.Context(), user.ID, listing.AskKey, listing.AskQty)
			_, _ = st.Client.TradeListing.FindUnique(db.TradeListing.ID.Equals(id)).Update(
				db.TradeListing.Status.Set("open"),
				db.TradeListing.BuyerID.SetOptional(nil),
				db.TradeListing.CompletedAt.SetOptional(nil),
			).Exec(r.Context())
			http.Error(w, "Trade failed", http.StatusInternalServerError)
			return
		}
		if err := world.GrantStack(st, r.Context(), listing.SellerID, listing.AskKey, listing.AskQty); err != nil {
			log.Printf("world.trade seller grant failed listing=%s seller=%s item=%s qty=%d: %v",
				id, listing.SellerID, listing.AskKey, listing.AskQty, err)
		}
		updated, _ := st.Client.TradeListing.FindUnique(db.TradeListing.ID.Equals(id)).Exec(r.Context())
		credits, _ := world.GetCredits(st, r.Context(), user.ID)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok": true, "listing": updated, "stormCredits": credits,
			"inventory": mergedInventory(st, r, user.ID),
		})
	}
}

func worldCancelTradeHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		if ok, retry := world.AllowTrade(user.ID); !ok {
			world.WriteSlowDown(w, retry)
			return
		}
		id := chi.URLParam(r, "id")
		listing, err := st.Client.TradeListing.FindUnique(db.TradeListing.ID.Equals(id)).Exec(r.Context())
		if err != nil || listing == nil || listing.Status != "open" {
			http.Error(w, "Listing not available", http.StatusNotFound)
			return
		}
		if listing.SellerID != user.ID {
			http.Error(w, "Not your listing", http.StatusForbidden)
			return
		}
		claimed, err := st.Client.TradeListing.FindMany(
			db.TradeListing.ID.Equals(id),
			db.TradeListing.Status.Equals("open"),
		).Update(
			db.TradeListing.Status.Set("cancelled"),
		).Exec(r.Context())
		if err != nil || claimed == nil || claimed.Count != 1 {
			http.Error(w, "Listing already closed", http.StatusConflict)
			return
		}
		_ = world.GrantStack(st, r.Context(), user.ID, listing.OfferKey, listing.OfferQty)
		w.WriteHeader(http.StatusNoContent)
	}
}

// ── Phase 5 — Deployable REST handlers ──────────────────────────────────────

func worldMyDeployablesHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		list := world.ListMyDeployables(st, r.Context(), user.ID)
		if list == nil {
			list = []world.DeployableView{}
		}
		_ = json.NewEncoder(w).Encode(list)
	}
}

func worldNearbyDeployablesHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		// Default to main St. John valley center or extract params
		lat, lng, radius := 45.8, -68.5, 2.5
		list := world.ListNearbyDeployables(st, r.Context(), lat, lng, radius)
		if list == nil {
			list = []world.DeployableView{}
		}
		_ = json.NewEncoder(w).Encode(list)
	}
}

func worldDeployKindsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(world.DeployKinds)
	}
}

type placeDeployableReq struct {
	Kind   string  `json:"kind"`
	Label  string  `json:"label"`
	Lat    float64 `json:"lat"`
	Lng    float64 `json:"lng"`
	Public bool    `json:"public"`
}

func worldPlaceDeployableHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		if ok, retry := world.AllowCraft(user.ID); !ok { // reuse craft rate limiter
			world.WriteSlowDown(w, retry)
			return
		}
		var req placeDeployableReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Kind == "" {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}
		v, err := world.PlaceDeployable(st, r.Context(), user.ID, req.Kind, req.Label, req.Lat, req.Lng, req.Public)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		_ = json.NewEncoder(w).Encode(v)
	}
}

func worldCollectDeployableHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		id := chi.URLParam(r, "id")
		v, qty, err := world.CollectDeployable(st, r.Context(), user.ID, id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok": true,
			"deployable": v,
			"collectedQty": qty,
			"inventory": mergedInventory(st, r, user.ID),
		})
	}
}

func worldRefuelDeployableHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		id := chi.URLParam(r, "id")
		v, err := world.RefuelDeployable(st, r.Context(), user.ID, id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		_ = json.NewEncoder(w).Encode(v)
	}
}

func worldRepairDeployableHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		id := chi.URLParam(r, "id")
		v, err := world.RepairDeployable(st, r.Context(), user.ID, id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		_ = json.NewEncoder(w).Encode(v)
	}
}

func worldRemoveDeployableHandler(st *store.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		user, ok := auth.UserFromContext(r.Context())
		if !ok {
			http.Error(w, "Login required", http.StatusUnauthorized)
			return
		}
		id := chi.URLParam(r, "id")
		if err := world.RemoveDeployable(st, r.Context(), user.ID, id); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true})
	}
}

