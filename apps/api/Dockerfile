# Multi-stage Dockerfile for Go Nutrition API
# Build stage
FROM golang:1.24-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/server cmd/server/main.go

# Production runtime stage
FROM alpine:3.21

RUN apk --no-cache add ca-certificates tzdata \
    && addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=builder /app/bin/server /app/server

# The course page images (COURSES_DIR): a named volume mounted here starts with this owner, so the non-root user can write
RUN mkdir -p /data/courses && chown -R appuser:appgroup /app /data/courses

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1

CMD ["/app/server"]
