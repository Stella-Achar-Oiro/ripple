FROM golang:1.17-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache gcc musl-dev sqlite-dev

# Copy go.mod and go.sum
COPY go.mod go.sum ./
RUN go mod download

# Copy the source code
COPY . .

# Build the application
RUN go build -o main ./server.go

# Expose the API port
EXPOSE 8080

# Run the application
CMD ["./main"]