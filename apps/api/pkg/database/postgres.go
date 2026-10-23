package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresClient wraps the pgxpool.Pool instance
type PostgresClient struct {
	Pool *pgxpool.Pool
}

// NewPostgresPool initializes a PostgreSQL 17 connection pool using session mode on port 5432.
// Prepared statements are fully supported in session mode.
func NewPostgresPool(ctx context.Context, connStr ...string) (*PostgresClient, error) {
	var targetConnStr string
	if len(connStr) > 0 && connStr[0] != "" {
		targetConnStr = connStr[0]
	} else {
		targetConnStr = os.Getenv("DATABASE_URL")
		if targetConnStr == "" {
			targetConnStr = "postgresql://postgres:postgres@localhost:5432/postgres?sslmode=disable"
		}
	}

	config, err := pgxpool.ParseConfig(targetConnStr)
	if err != nil {
		return nil, fmt.Errorf("failed to parse DATABASE_URL: %w", err)
	}

	// Configure pool parameters for high throughput and session stability
	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = 1 * time.Hour
	config.MaxConnIdleTime = 15 * time.Minute
	config.HealthCheckPeriod = 30 * time.Second

	// Set search_path and statement_timeout (5s) to protect the connection pool from slow query starvation
	config.ConnConfig.RuntimeParams = map[string]string{
		"search_path":       "nutrition, public, extensions",
		"statement_timeout": "5000",
	}

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create pgx pool: %w", err)
	}

	// Ping with timeout
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		log.Printf("Warning: Database ping failed during initialization (%v). Connection pool will retry.", err)
	}

	return &PostgresClient{Pool: pool}, nil
}

// Close gracefully closes all active connections in the pool
func (c *PostgresClient) Close() {
	if c.Pool != nil {
		c.Pool.Close()
	}
}
