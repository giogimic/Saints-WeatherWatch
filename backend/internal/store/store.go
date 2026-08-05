package store

import (
	"fmt"

	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

// Store wraps the Prisma client for use across the app.
type Store struct {
	Client *db.PrismaClient
}

// New creates a new Store and connects to the database.
func New(databaseURL string) (*Store, error) {
	client := db.NewClient(
		db.WithDatasourceURL(databaseURL),
	)

	if err := client.Prisma.Connect(); err != nil {
		return nil, fmt.Errorf("prisma connect: %w", err)
	}

	// Schema is applied via `prisma db push` or `prisma migrate deploy`.
	return &Store{Client: client}, nil
}

// Close disconnects from the database.
func (s *Store) Close() {
	_ = s.Client.Prisma.Disconnect()
}