package store

import (
	"fmt"
	"net/url"
	"path/filepath"
	"strings"

	db "github.com/saints-weatherwatch/backend/internal/store/gen"
)

// Store wraps the Prisma client for use across the app.
type Store struct {
	Client *db.PrismaClient
}

// New creates a new Store and connects to the database.
func New(databaseURL string) (*Store, error) {
	databaseURL = resolveSQLiteURL(databaseURL)

	client := db.NewClient(
		db.WithDatasourceURL(databaseURL),
	)

	if err := client.Prisma.Connect(); err != nil {
		return nil, fmt.Errorf("prisma connect: %w", err)
	}

	return &Store{Client: client}, nil
}

// resolveSQLiteURL turns relative file: paths into absolute ones so the Go
// process cwd and Prisma CLI schema-dir resolution can share one DB file when
// callers pass an already-absolute URL (or we abs from cwd here).
func resolveSQLiteURL(raw string) string {
	if !strings.HasPrefix(raw, "file:") {
		return raw
	}
	pathPart := strings.TrimPrefix(raw, "file:")
	// Preserve query params (?mode= etc.)
	pathOnly := pathPart
	query := ""
	if i := strings.Index(pathPart, "?"); i >= 0 {
		pathOnly = pathPart[:i]
		query = pathPart[i:]
	}
	// file:/absolute or file:///absolute
	if strings.HasPrefix(pathOnly, "/") || (len(pathOnly) > 2 && pathOnly[1] == ':') {
		return raw
	}
	abs, err := filepath.Abs(pathOnly)
	if err != nil {
		return raw
	}
	// Prisma on Windows accepts file:C:/... or file:///C:/...
	absURL := "file:" + filepath.ToSlash(abs) + query
	// Also handle URL-encoded spaces defensively
	if _, err := url.Parse(absURL); err != nil {
		return raw
	}
	return absURL
}

// Close disconnects from the database.
func (s *Store) Close() {
	_ = s.Client.Prisma.Disconnect()
}
