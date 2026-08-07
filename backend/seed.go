package main

import (
	"context"
	"fmt"
	"log"

	"github.com/saints-weatherwatch/backend/internal/auth"
	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

func main() {
	client := db.NewClient()
	if err := client.Prisma.Connect(); err != nil {
		log.Fatal(err)
	}
	defer client.Prisma.Disconnect()

	pinHash, err := auth.HashPIN("1234")
	if err != nil {
		log.Fatal(err)
	}

	user, err := client.User.CreateOne(
		db.User.ChaserName.Set("test"),
		db.User.ChaserNameNorm.Set("test"),
		db.User.PinHash.Set(pinHash),
		db.User.EquippedVehicleKey.Set("starter_car"),
		db.User.StormCredits.Set(75),
	).Exec(context.Background())
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println("Created user:", user.ChaserName)
}
