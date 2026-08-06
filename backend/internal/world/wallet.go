package world

import (
	"context"
	"errors"

	"github.com/saints-weatherwatch/backend/internal/loot"
	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

var (
	ErrInsufficientCredits = errors.New("insufficient credits")
	ErrInsufficientItems   = errors.New("insufficient items")
	ErrUnknownItem         = errors.New("unknown item")
	ErrNotVendorStock      = errors.New("not sold by vendor")
	ErrBadQty              = errors.New("invalid quantity")
)

// GetCredits returns the player's Storm Credits balance.
func GetCredits(st *store.Store, ctx context.Context, userID string) (int, error) {
	if st == nil || userID == "" {
		return 0, errors.New("no store")
	}
	u, err := st.Client.User.FindUnique(db.User.ID.Equals(userID)).Exec(ctx)
	if err != nil || u == nil {
		return 0, err
	}
	return u.StormCredits, nil
}

// AdjustCredits adds delta (may be negative). Returns new balance.
func AdjustCredits(st *store.Store, ctx context.Context, userID string, delta int) (int, error) {
	if st == nil || userID == "" {
		return 0, errors.New("no store")
	}
	u, err := st.Client.User.FindUnique(db.User.ID.Equals(userID)).Exec(ctx)
	if err != nil || u == nil {
		return 0, err
	}
	next := u.StormCredits + delta
	if next < 0 {
		return u.StormCredits, ErrInsufficientCredits
	}
	updated, err := st.Client.User.FindUnique(db.User.ID.Equals(userID)).Update(
		db.User.StormCredits.Set(next),
	).Exec(ctx)
	if err != nil {
		return u.StormCredits, err
	}
	return updated.StormCredits, nil
}

// VendorSellFromPlayer: player sells qty of itemKey to NPC vendor.
func VendorSellFromPlayer(st *store.Store, ctx context.Context, userID, itemKey string, qty int) (creditsGained, balance int, err error) {
	if qty < 1 || qty > MaxVendorQty {
		return 0, 0, ErrBadQty
	}
	if ItemValue(itemKey) <= 0 && !itemKnown(itemKey) {
		return 0, 0, ErrUnknownItem
	}
	if StackCount(st, ctx, userID, itemKey) < qty {
		bal, _ := GetCredits(st, ctx, userID)
		return 0, bal, ErrInsufficientItems
	}
	unit := VendorBuyPrice(itemKey)
	gain := unit * qty
	if !ConsumeStack(st, ctx, userID, itemKey, qty) {
		bal, _ := GetCredits(st, ctx, userID)
		return 0, bal, ErrInsufficientItems
	}
	bal, err := AdjustCredits(st, ctx, userID, gain)
	if err != nil {
		_ = GrantStack(st, ctx, userID, itemKey, qty)
		return 0, 0, err
	}
	return gain, bal, nil
}

// VendorBuyToPlayer: player buys qty of itemKey from NPC vendor stock.
func VendorBuyToPlayer(st *store.Store, ctx context.Context, userID, itemKey string, qty int) (creditsSpent, balance int, err error) {
	if qty < 1 || qty > MaxVendorQty {
		return 0, 0, ErrBadQty
	}
	if !IsVendorStock(itemKey) {
		return 0, 0, ErrNotVendorStock
	}
	unit := VendorSellPrice(itemKey)
	cost := unit * qty
	bal, err := GetCredits(st, ctx, userID)
	if err != nil {
		return 0, 0, err
	}
	if bal < cost {
		return 0, bal, ErrInsufficientCredits
	}
	bal, err = AdjustCredits(st, ctx, userID, -cost)
	if err != nil {
		return 0, bal, err
	}
	if err := GrantStack(st, ctx, userID, itemKey, qty); err != nil {
		_, _ = AdjustCredits(st, ctx, userID, cost)
		return 0, bal + cost, err
	}
	return cost, bal, nil
}

func itemKnown(key string) bool {
	if _, ok := LookupItem(key); ok {
		return true
	}
	_, ok := loot.Lookup(key)
	return ok
}

// CountOpenListings for a seller.
func CountOpenListings(st *store.Store, ctx context.Context, userID string) int {
	if st == nil {
		return 0
	}
	n, err := st.Client.TradeListing.FindMany(
		db.TradeListing.SellerID.Equals(userID),
		db.TradeListing.Status.Equals("open"),
	).Exec(ctx)
	if err != nil {
		return MaxOpenListings
	}
	return len(n)
}
