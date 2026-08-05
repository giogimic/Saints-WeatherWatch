FROM golang:alpine AS builder

ARG DB_PROVIDER=sqlite

# Install dependencies for Prisma Client Go (needs openssl)
RUN apk add --no-cache openssl nodejs npm

WORKDIR /app

# Copy Go mod files and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the backend files
COPY . .

# Dynamically set the DB provider before generating
RUN sed -i "s/provider = \"sqlite\"/provider = \"${DB_PROVIDER}\"/" prisma/schema.prisma

# Generate Prisma Client (requires schema.prisma and downloads the query engine)
RUN go run github.com/steebchen/prisma-client-go generate

# Build the server
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# Final stage
FROM golang:alpine

# Node and openssl are needed by Prisma CLI during 'db push' at runtime
RUN apk add --no-cache openssl ca-certificates nodejs npm

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/server .

# Copy prisma schema for runtime push, and go module for 'go run'
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/go.mod ./go.mod
COPY --from=builder /app/go.sum ./go.sum

# Copy entrypoint
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Ensure we can persist the DB if SQLite is used
VOLUME ["/app"]

EXPOSE 8080

CMD ["./entrypoint.sh"]
