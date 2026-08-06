package world

import "testing"

func TestVendorPricesBalanced(t *testing.T) {
	buy := VendorBuyPrice("scrap_metal")
	sell := VendorSellPrice("scrap_metal")
	if buy >= sell {
		t.Fatalf("vendor buy %d should be < sell %d", buy, sell)
	}
	if buy < 1 || sell < 1 {
		t.Fatal("prices must be positive")
	}
}

func TestRareWorthMore(t *testing.T) {
	if ItemValue("advanced_sensor") <= ItemValue("scrap_metal")*5 {
		t.Fatalf("rare should dwarf common")
	}
}

func TestVendorStock(t *testing.T) {
	if !IsVendorStock("battery") {
		t.Fatal("battery should be stock")
	}
	if IsVendorStock("mesocyclone_coin") {
		t.Fatal("rare trophy should not be infinite stock")
	}
}
