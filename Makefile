.PHONY: dev dev-api dev-web build build-api build-web db-migrate migrate-up migrate-down db-backup db-restore test test-api test-integration test-web lint lint-api lint-web clean

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

db-migrate: migrate-up

migrate-up:
	@echo "Applying database migrations..."
	@for f in migrations/*_*.up.sql; do \
		echo "Applying $$f..."; \
		psql "$$DATABASE_URL" -f "$$f" || true; \
	done

migrate-down:
	@echo "Rolling back database migrations..."
	@for f in $$(ls -r migrations/*_*.down.sql 2>/dev/null); do \
		echo "Rolling back $$f..."; \
		psql "$$DATABASE_URL" -f "$$f" || true; \
	done

db-backup:
	@bash scripts/db-backup.sh

db-restore:
	@bash scripts/db-restore.sh $(FILE)

test: test-api test-web

test-api:
	cd apps/api && go test -v ./...

# Every diary write against a throwaway Postgres 17 with all migrations (docker compose; or TEST_DATABASE_URL)
test-integration:
	cd apps/api && ./scripts/test-integration.sh

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
