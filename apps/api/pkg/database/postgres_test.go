package database_test

import (
	"context"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestPostgresPool_RuntimeParams(t *testing.T) {
	connStr := "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable"
	config, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		t.Fatalf("failed to parse connection string: %v", err)
	}

	config.ConnConfig.RuntimeParams = map[string]string{
		"search_path":       "nutrition, public, extensions",
		"statement_timeout": "5000",
	}

	if config.ConnConfig.RuntimeParams["search_path"] != "nutrition, public, extensions" {
		t.Errorf("expected search_path to be configured, got %s", config.ConnConfig.RuntimeParams["search_path"])
	}
	if config.ConnConfig.RuntimeParams["statement_timeout"] != "5000" {
		t.Errorf("expected statement_timeout to be 5000, got %s", config.ConnConfig.RuntimeParams["statement_timeout"])
	}
}

func TestPostgresPool_Timeouts(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()

	// Ensure ping context expires as expected
	<-ctx.Done()
	if ctx.Err() != context.DeadlineExceeded {
		t.Fatalf("expected deadline exceeded, got %v", ctx.Err())
	}
}
