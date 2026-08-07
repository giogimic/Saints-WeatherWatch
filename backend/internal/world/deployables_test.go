package world

import (
	"context"
	"os"
	"testing"

	"github.com/saints-weatherwatch/backend/internal/store"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

func TestPlaceAndCollectDeployable(t *testing.T) {
	// Initialize a temporary database for testing
	dbFile := "test_deploy.db"
	_ = os.Remove(dbFile)
	defer os.Remove(dbFile)

	// Set environment variable DATABASE_URL for prisma
	os.Setenv("DATABASE_URL", "file:"+dbFile)
	defer os.Unsetenv("DATABASE_URL")

	// We must run db push programmatically or mock it, but since prisma-client-go is generated,
	// let's initialize the prisma client and run schema push if supported, or we can just use the real db for integration,
	// or we can invoke client.Prisma.Connect() then execute raw schema statements.
	// Since prisma client-go doesn't expose easy migration APIs directly, let's create a real database file and run `db push` on it.
	
	st, err := store.New("file:" + dbFile)
	if err != nil {
		t.Fatalf("failed to open test store: %v", err)
	}
	defer func() {
		_ = st.Client.Prisma.Disconnect()
	}()

	// Execute raw DDL for sqlite to create the schema!
	ctx := context.Background()
	
	// Create User Table
	_, err = st.Client.Prisma.ExecuteRaw(`
		CREATE TABLE User (
			id TEXT PRIMARY KEY NOT NULL,
			chaserName TEXT UNIQUE NOT NULL,
			chaserNameNorm TEXT UNIQUE NOT NULL,
			pinHash TEXT NOT NULL,
			email TEXT UNIQUE,
			equippedVehicleKey TEXT NOT NULL DEFAULT 'starter_car',
			xp INTEGER NOT NULL DEFAULT 0,
			level INTEGER NOT NULL DEFAULT 1,
			stormCredits INTEGER NOT NULL DEFAULT 75,
			createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
	`).Exec(ctx)
	if err != nil {
		t.Fatalf("failed to create User table: %v", err)
	}

	// Create UserCollectible Table
	_, err = st.Client.Prisma.ExecuteRaw(`
		CREATE TABLE UserCollectible (
			id TEXT PRIMARY KEY NOT NULL,
			userId TEXT NOT NULL,
			itemKey TEXT NOT NULL,
			count INTEGER NOT NULL DEFAULT 1,
			firstAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE,
			UNIQUE(userId, itemKey)
		);
	`).Exec(ctx)
	if err != nil {
		t.Fatalf("failed to create UserCollectible table: %v", err)
	}

	// Create Deployable Table
	_, err = st.Client.Prisma.ExecuteRaw(`
		CREATE TABLE Deployable (
			id TEXT PRIMARY KEY NOT NULL,
			userId TEXT NOT NULL,
			kind TEXT NOT NULL,
			label TEXT NOT NULL DEFAULT '',
			lat REAL NOT NULL,
			lng REAL NOT NULL,
			health INTEGER NOT NULL DEFAULT 100,
			fuel INTEGER NOT NULL DEFAULT 100,
			public BOOLEAN NOT NULL DEFAULT 0,
			yieldKey TEXT NOT NULL DEFAULT 'research_sample',
			yieldStored INTEGER NOT NULL DEFAULT 0,
			lastCollect DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			placedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			expiresAt DATETIME NOT NULL,
			FOREIGN KEY (userId) REFERENCES User (id) ON DELETE CASCADE
		);
	`).Exec(ctx)
	if err != nil {
		t.Fatalf("failed to create Deployable table: %v", err)
	}

	// Create user
	user, err := st.Client.User.CreateOne(
		db.User.ChaserName.Set("TestChaser"),
		db.User.ChaserNameNorm.Set("testchaser"),
		db.User.PinHash.Set("1234"),
	).Exec(ctx)
	if err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	// 1. Grant a basic probe to inventory
	err = GrantStack(st, ctx, user.ID, "basic_probe", 1)
	if err != nil {
		t.Fatalf("failed to grant basic probe: %v", err)
	}

	// 2. Place the basic probe
	v, err := PlaceDeployable(st, ctx, user.ID, "basic_probe", "My Test Probe", 45.8, -68.5, false)
	if err != nil {
		t.Fatalf("failed to place deployable: %v", err)
	}

	if v.Kind != "basic_probe" || v.Label != "My Test Probe" || v.Lat != 45.8 || v.Lng != -68.5 {
		t.Errorf("unexpected deployable details: %+v", v)
	}

	// Verify inventory is empty now
	if count := StackCount(st, ctx, user.ID, "basic_probe"); count != 0 {
		t.Errorf("expected basic_probe to be consumed, got count: %d", count)
	}

	// 3. Manually mock some stored yield in the database
	_, err = st.Client.Deployable.FindUnique(
		db.Deployable.ID.Equals(v.ID),
	).Update(
		db.Deployable.YieldStored.Set(3),
	).Exec(ctx)
	if err != nil {
		t.Fatalf("failed to mock yield: %v", err)
	}

	// 4. Collect from the deployable
	updatedView, qty, err := CollectDeployable(st, ctx, user.ID, v.ID)
	if err != nil {
		t.Fatalf("failed to collect from deployable: %v", err)
	}

	if qty != 3 {
		t.Errorf("expected collected qty 3, got: %d", qty)
	}

	if updatedView.YieldStored != 0 {
		t.Errorf("expected yield stored to be reset, got: %d", updatedView.YieldStored)
	}

	// Verify item is now in player's inventory
	if count := StackCount(st, ctx, user.ID, "research_sample"); count != 3 {
		t.Errorf("expected 3 research_sample in inventory, got: %d", count)
	}

	// 5. Refuel the deployable (first grant solar pack to inventory)
	err = GrantStack(st, ctx, user.ID, "solar_pack", 1)
	if err != nil {
		t.Fatalf("failed to grant solar pack: %v", err)
	}

	// Drain fuel to 50%
	_, _ = st.Client.Deployable.FindUnique(
		db.Deployable.ID.Equals(v.ID),
	).Update(
		db.Deployable.Fuel.Set(50),
	).Exec(ctx)

	refueledView, err := RefuelDeployable(st, ctx, user.ID, v.ID)
	if err != nil {
		t.Fatalf("failed to refuel: %v", err)
	}

	if refueledView.Fuel != 100 {
		t.Errorf("expected fuel to be reset to 100, got: %d", refueledView.Fuel)
	}

	// Verify solar_pack was consumed
	if count := StackCount(st, ctx, user.ID, "solar_pack"); count != 0 {
		t.Errorf("expected solar_pack to be consumed, got: %d", count)
	}

	// 6. Recover/Remove deployable
	err = RemoveDeployable(st, ctx, user.ID, v.ID)
	if err != nil {
		t.Fatalf("failed to remove: %v", err)
	}

	// Verify it is gone from the database
	check, err := st.Client.Deployable.FindUnique(
		db.Deployable.ID.Equals(v.ID),
	).Exec(ctx)
	if err == nil && check != nil {
		t.Error("expected deployable to be deleted")
	}

	// Verify salvage (scrap metal) was returned to user
	if count := StackCount(st, ctx, user.ID, "scrap_metal"); count < 1 {
		t.Errorf("expected salvage scrap metal, got: %d", count)
	}
}
