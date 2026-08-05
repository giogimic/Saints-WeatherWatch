#!/bin/sh
set -e

echo "Starting WeatherWatch Backend..."

DB_URL="${DATABASE_URL:-file:/app/data/weatherwatch.db}"

# Prisma CLI resolves relative file: paths against the schema directory, while
# the Go server resolves them against the process cwd. Force an absolute path so
# both always agree on the same database file.
case "$DB_URL" in
  file:*)
    db_path=${DB_URL#file:}
    db_path=${db_path%%\?*}
    case "$db_path" in
      /*) ;;
      *) db_path="$(pwd)/${db_path#./}" ;;
    esac
    mkdir -p "$(dirname "$db_path")"
    DB_URL="file:${db_path}"
    echo "SQLite database: $db_path"
    ;;
  *)
    echo "Non-SQLite database configured."
    ;;
esac

export DATABASE_URL="$DB_URL"

echo "Pushing database schema..."
if ! go run github.com/steebchen/prisma-client-go db push --schema prisma/schema.prisma --skip-generate; then
  echo "WARNING: prisma db push failed. Starting server anyway."
  echo "         The archive will not persist until the schema is applied."
fi

echo "Starting server..."
exec ./server
