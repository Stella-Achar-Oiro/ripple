FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache gcc musl-dev sqlite-dev

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=1 GOOS=linux go build -o main server.go

FROM alpine:latest

RUN apk --no-cache add ca-certificates sqlite
WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/main .

# Copy migrations
COPY --from=builder /app/pkg/db/migrations ./pkg/db/migrations

# Create necessary directories
RUN mkdir -p ./data ./uploads/avatars ./uploads/posts ./uploads/comments

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]