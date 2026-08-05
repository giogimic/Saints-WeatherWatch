FROM golang:alpine AS builder

# Install dependencies for Prisma Client Go (needs openssl)
RUN apk add --no-cache openssl nodejs npm

WORKDIR /app

# Copy Go mod files and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the backend files
COPY . .

# Generate Prisma Client (requires schema.prisma and downloads the query engine)
RUN go run github.com/steebchen/prisma-client-go generate

# Build the server
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# Final stage
FROM alpine:latest

RUN apk add --no-cache openssl ca-certificates

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/server .

# Copy prisma schema/db if needed (mostly the query engine gets bundled/downloaded, but prisma directory is good to have for push)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/weatherwatch.db ./weatherwatch.db

# Ensure we can persist the DB
VOLUME ["/app"]

EXPOSE 8080

CMD ["./server"]
