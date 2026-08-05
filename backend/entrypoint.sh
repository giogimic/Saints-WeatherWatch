#!/bin/sh
set -e

echo "Starting WeatherWatch Backend..."
echo "Database URL is configured."

# Push Prisma schema to the database
echo "Pushing database schema..."
go run github.com/steebchen/prisma-client-go db push

echo "Starting server..."
exec ./server
