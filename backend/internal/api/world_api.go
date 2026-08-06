package api

import (
	"encoding/json"
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

func mountWorldRoutes(r chi.Router, st *store.Store) {
	r.Get("/world/catalog", worldCatalogHandler())
	r.Get("/world/inventory", worldInventoryHandler(st))
	r.Post("/world/craft", worldCraftHandler(st))
	r.Get("/world/trades", worldTradesHandler(st))
	r.Post("/world/trades", worldCreateTradeHandler(st))
	r.Post("/world/trades/{id}/buy", worldBuyTradeHandler(st))
	r.Delete("/world/trades/{id}", worldCancelTradeHandler(st))
}

func worldCatalogHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"items":   world.ItemCatalog,
			"recipes": world.Recipes,
			"bounds": map[string]float64{
				"minLat": world.Bounds.MinLat, "maxLat": world.Bounds.MaxLat,
				"minLng": world.Bounds.MinLng, "maxLng": world.Bounds.MaxLng,
			},
			"loot": loot.Catalog,
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
		_ = json.NewEncoder(w).Encode(mergedInventory(st, r, user.ID))
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
			// Refund consumed inputs so a grant failure cannot burn materials.
			for _, in := range recipe.Inputs {
				_ = world.GrantStack(st, r.Context(), user.ID, in.Key, in.Qty)
			}
			http.Error(w, "Craft grant failed", http.StatusInternalServerError)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok":        true,
			"recipeId":  recipe.ID,
			"output":    recipe.Output,
			"inventory": mergedInventory(st, r, user.ID),
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
		var req createTradeReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid input", http.StatusBadRequest)
			return
		}
		if req.OfferQty < 1 || req.AskQty < 1 || req.OfferKey == "" || req.AskKey == "" || req.OfferKey == req.AskKey {
			http.Error(w, "Invalid trade", http.StatusBadRequest)
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
		// Reserve offer by consuming into escrow (listing holds the goods).
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
			_ = world.GrantStack(st, r.Context(), user.ID, req.OfferKey, req.OfferQty) // refund
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
		// CAS: only one buyer can flip open → sold.
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
		_ = json.NewEncoder(w).Encode(map[string]any{
			"ok": true, "listing": updated, "inventory": mergedInventory(st, r, user.ID),
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
