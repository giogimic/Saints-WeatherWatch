// Package loot defines Radar Chase collectables and inventory helpers.
package loot

import (
	"context"
	"time"

	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

const MaxItemsPerRun = 8

type Def struct {
	Key    string `json:"key"`
	Name   string `json:"name"`
	Blurb  string `json:"blurb"`
	Rarity string `json:"rarity"` // common | uncommon | rare
	XP     int    `json:"xp"`
}

var Catalog = []Def{
	{Key: "radar_core", Name: "Radar Core Ping", Blurb: "A bright blob on the scope.", Rarity: "common", XP: 5},
	{Key: "hail_stone", Name: "Hail Sample", Blurb: "Cold evidence from the core.", Rarity: "common", XP: 5},
	{Key: "wind_flag", Name: "Wind Flag", Blurb: "Gusts marked for the log.", Rarity: "common", XP: 5},
	{Key: "storm_photo", Name: "Storm Photo", Blurb: "Shelf cloud snapshot.", Rarity: "uncommon", XP: 10},
	{Key: "funnel_sketch", Name: "Funnel Sketch", Blurb: "Quick field drawing.", Rarity: "uncommon", XP: 10},
	{Key: "lightning_chip", Name: "Lightning Chip", Blurb: "Strike timing note.", Rarity: "uncommon", XP: 10},
	{Key: "mesocyclone_coin", Name: "Mesocyclone Coin", Blurb: "Rare rotation trophy.", Rarity: "rare", XP: 25},
	{Key: "chase_medal", Name: "Chase Medal", Blurb: "Clean intercept badge.", Rarity: "rare", XP: 25},
}

var byKey map[string]Def

func init() {
	byKey = make(map[string]Def, len(Catalog))
	for _, d := range Catalog {
		byKey[d.Key] = d
	}
}

func Lookup(key string) (Def, bool) {
	d, ok := byKey[key]
	return d, ok
}

// WeightedKeys for random drops (commons more often).
func WeightedKeys() []string {
	out := make([]string, 0, 24)
	for _, d := range Catalog {
		n := 1
		switch d.Rarity {
		case "common":
			n = 5
		case "uncommon":
			n = 3
		case "rare":
			n = 1
		}
		for i := 0; i < n; i++ {
			out = append(out, d.Key)
		}
	}
	return out
}

type ItemView struct {
	Key    string `json:"key"`
	Name   string `json:"name"`
	Blurb  string `json:"blurb"`
	Rarity string `json:"rarity"`
	Count  int    `json:"count"`
	XP     int    `json:"xp"`
}

func Inventory(st *store.Store, ctx context.Context, userID string) []ItemView {
	out := []ItemView{}
	if st == nil || userID == "" {
		return out
	}
	rows, err := st.Client.UserCollectible.FindMany(
		db.UserCollectible.UserID.Equals(userID),
	).Exec(ctx)
	if err != nil {
		return out
	}
	counts := map[string]int{}
	for _, r := range rows {
		counts[r.ItemKey] = r.Count
	}
	for _, d := range Catalog {
		if c, ok := counts[d.Key]; ok && c > 0 {
			out = append(out, ItemView{
				Key: d.Key, Name: d.Name, Blurb: d.Blurb, Rarity: d.Rarity, Count: c, XP: d.XP,
			})
		}
	}
	return out
}

// GrantOne increments inventory for a known item. Returns false if unknown.
func GrantOne(st *store.Store, ctx context.Context, userID, key string) bool {
	def, ok := Lookup(key)
	if !ok || st == nil || userID == "" {
		return false
	}
	existing, err := st.Client.UserCollectible.FindUnique(
		db.UserCollectible.UserIDItemKey(
			db.UserCollectible.UserID.Equals(userID),
			db.UserCollectible.ItemKey.Equals(def.Key),
		),
	).Exec(ctx)
	if err == nil && existing != nil {
		_, err = st.Client.UserCollectible.FindUnique(
			db.UserCollectible.UserIDItemKey(
				db.UserCollectible.UserID.Equals(userID),
				db.UserCollectible.ItemKey.Equals(def.Key),
			),
		).Update(
			db.UserCollectible.Count.Increment(1),
			db.UserCollectible.UpdatedAt.Set(time.Now().UTC()),
		).Exec(ctx)
		return err == nil
	}
	_, err = st.Client.UserCollectible.CreateOne(
		db.UserCollectible.ItemKey.Set(def.Key),
		db.UserCollectible.User.Link(db.User.ID.Equals(userID)),
		db.UserCollectible.Count.Set(1),
	).Exec(ctx)
	return err == nil
}

// ScoreRun validates item keys (max MaxItemsPerRun), grants loot, returns XP total for items.
func ScoreRun(st *store.Store, ctx context.Context, userID string, keys []string) (granted []string, itemXP int) {
	granted = []string{}
	if len(keys) > MaxItemsPerRun {
		keys = keys[:MaxItemsPerRun]
	}
	for _, k := range keys {
		def, ok := Lookup(k)
		if !ok {
			continue
		}
		if GrantOne(st, ctx, userID, def.Key) {
			granted = append(granted, def.Key)
			itemXP += def.XP
		}
	}
	return granted, itemXP
}
