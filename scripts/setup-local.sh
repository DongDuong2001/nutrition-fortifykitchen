#!/usr/bin/env bash
set -euo pipefail

echo "=============================================="
echo "Nutrition Platform - Local Environment Setup"
echo "=============================================="

# 1. Environment variables
if [ ! -f .env ]; then
  echo "--> Creating .env from .env.example..."
  cp .env.example .env
else
  echo "--> .env already exists."
fi

# 2. Docker container startup
echo "--> Starting Postgres 17 container..."
docker compose up -d postgres

# 3. Wait for Postgres to be healthy
echo "--> Waiting for PostgreSQL 17 to become ready on port 5432..."
until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
done
echo "--> PostgreSQL is ready!"

# 4. Backend dependencies
echo "--> Downloading Go dependencies..."
cd apps/api
go mod download
cd ../..

# 5. Frontend dependencies
echo "--> Installing Next.js dependencies..."
cd apps/web
npm install
cd ../..

echo "=============================================="
echo "Local setup completed successfully!"
echo "Run 'make dev-api' and 'make dev-web' to start development."
echo "=============================================="
