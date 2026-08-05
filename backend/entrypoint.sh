#!/bin/sh
set -e

echo "Starting WeatherWatch Backend..."
echo "Database URL is configured."

# Prisma CLI resolves file: URLs relative to the schema directory (prisma/),
# while the Go server resolves them relative to the process cwd (/app).
# file:../data/weatherwatch.db from prisma/ => /app/data/weatherwatch.db
echo "Pushing database schema..."
DATABASE_URL="${PRISMA_DATABASE_URL:-file:../data/weatherwatch.db}" \
  go run github.com/steebchen/prisma-client-go db push --schema prisma/schema.prisma

echo "Starting server..."
exec ./server
