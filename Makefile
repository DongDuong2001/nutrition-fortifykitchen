.PHONY: dev dev-api dev-web build build-api build-web db-migrate test test-api test-web lint lint-api lint-web clean

dev:
	@echo "Starting development environment..."
	docker compose up -d postgres
	@echo "Run 'make dev-api' in one terminal and 'make dev-web' in another terminal."

dev-api:
	cd apps/api && go run cmd/server/main.go

dev-web:
	cd apps/web && npm run dev

build: build-api build-web

build-api:
	cd apps/api && go build -v -o bin/server cmd/server/main.go

build-web:
	cd apps/web && npm run build

db-migrate:
	@echo "Applying database migrations..."
	docker compose exec -T postgres psql -U postgres -d postgres -f /docker-entrypoint-initdb.d/01-init.sql || psql "$$DATABASE_URL" -f migrations/000001_init_nutrition_schema.up.sql

test: test-api test-web

test-api:
	cd apps/api && go test -v ./...

test-web:
	cd apps/web && npm run test --if-present

lint: lint-api lint-web

lint-api:
	cd apps/api && go vet ./...

lint-web:
	cd apps/web && npm run lint --if-present

clean:
	docker compose down -v
	rm -rf apps/api/bin
