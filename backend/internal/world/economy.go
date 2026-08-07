package world

import (
	"math"
)

// Economy: Storm Credits. Vendor buy < base < player list ask (by design).
const (
	StartingCredits   = 75
	VendorBuyRatio    = 0.65 // player sells to vendor
	VendorSellMarkup  = 1.0  // vendor sells at base value
	MaxTradeOfferQty  = 20
	MaxVendorQty      = 25
	MaxOpenListings   = 8
)

// Item values (Storm Credits). Tuned so commons drip, rares feel earned.
var itemValues = map[string]int{
	"scrap_metal":     4,
	"wiring":          4,
	"battery":         6,
	"plastic_parts":   4,
	"copper":          5,
	"aluminum":        4,
	"electronics":     7,
	"scientific_note": 6,
	"fuel_can":        14,
	"camera_parts":    16,
	"gps_module":      22,
	"radio_parts":     18,
	"solar_cell":      18,
	"spare_tire":      15,
	"weather_journal": 20,
	"blueprint_frag":  55,
	"advanced_sensor": 70,
	"research_sample": 28,
	"basic_probe":     35,
	"repair_kit":      12,
	"field_journal":   40,
	"solar_pack":      45,
	"storm_photo":     30,
	"radar_core":      12,
	"hail_stone":      10,
	"wind_flag":       10,
	"funnel_sketch":   22,
	"lightning_chip":  22,
	"mesocyclone_coin": 60,
	"chase_medal":     60,
	// Phase 5 — deployable gear
	"solar_probe":      85,
	"weather_station":  200,
}

// VendorStock is what the Storm Market NPC sells (infinite stock).
var VendorStock = []string{
	"scrap_metal", "wiring", "battery", "plastic_parts", "copper", "aluminum",
	"electronics", "scientific_note", "fuel_can", "camera_parts", "radio_parts",
	"solar_cell", "spare_tire", "repair_kit", "radar_core",
}

// ItemValue returns base credit value for a catalog key.
func ItemValue(key string) int {
	if v, ok := itemValues[key]; ok && v > 0 {
		return v
	}
	if d, ok := LookupItem(key); ok {
		switch d.Rarity {
		case "rare":
			return 50
		case "uncommon":
			return 15
		default:
			return 5
		}
	}
	return 5
}

// VendorBuyPrice — credits the vendor pays the player.
func VendorBuyPrice(key string) int {
	v := int(math.Floor(float64(ItemValue(key)) * VendorBuyRatio))
	if v < 1 {
		return 1
	}
	return v
}

// VendorSellPrice — credits the player pays the vendor.
func VendorSellPrice(key string) int {
	v := int(math.Round(float64(ItemValue(key)) * VendorSellMarkup))
	if v < 1 {
		return 1
	}
	return v
}

func IsVendorStock(key string) bool {
	for _, k := range VendorStock {
		if k == key {
			return true
		}
	}
	return false
}

// EnrichItemsJSON adds value / vendor prices onto catalog item maps for API.
func CatalogWithValues() []map[string]any {
	out := make([]map[string]any, 0, len(ItemCatalog))
	for _, d := range ItemCatalog {
		out = append(out, map[string]any{
			"key": d.Key, "name": d.Name, "blurb": d.Blurb,
			"rarity": d.Rarity, "kind": d.Kind, "xp": d.XP,
			"value": ItemValue(d.Key),
			"vendorBuy": VendorBuyPrice(d.Key),
			"vendorSell": VendorSellPrice(d.Key),
		})
	}
	return out
}

func VendorCatalog() []map[string]any {
	out := make([]map[string]any, 0, len(VendorStock))
	for _, key := range VendorStock {
		name, rarity, kind := key, "common", "material"
		if d, ok := LookupItem(key); ok {
			name, rarity, kind = d.Name, d.Rarity, d.Kind
		}
		out = append(out, map[string]any{
			"key": key, "name": name, "rarity": rarity, "kind": kind,
			"value": ItemValue(key),
			"price": VendorSellPrice(key),
			"blurb": "Storm Market vendor stock",
		})
	}
	return out
}
