#!/usr/bin/env bash
set -euo pipefail

# --- Color Definitions ---
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}🔄 WeatherWatch Backup & Update Script 🔄${NC}"
echo -e "${CYAN}======================================================${NC}\n"

# 1. Source ENV if exists
if [ -f "$ROOT_DIR/.env" ]; then
  # Source .env safely, stripping carriage returns
  while IFS= read -r line || [ -n "$line" ]; do
    if [[ ! "$line" =~ ^# ]] && [[ -n "$line" ]]; then
      # Strip carriage return and export
      clean_line="${line%$'\r'}"
      export "$clean_line"
    fi
  done < "$ROOT_DIR/.env"
else
  echo -e "${YELLOW}⚠️ No .env file found. Assuming fresh environment or SQLite.${NC}"
fi

DB_PROVIDER=${DB_PROVIDER:-sqlite}

# 2. Backup Database
BACKUP_DIR="$ROOT_DIR/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}➔ Starting Database Backup...${NC}"

if [ "$DB_PROVIDER" = "mysql" ]; then
  echo -e "${CYAN}Detecting MariaDB configuration...${NC}"
  # Extract password from DATABASE_URL if MARIADB_ROOT_PASSWORD is not set
  DB_PASS=${MARIADB_ROOT_PASSWORD:-}
  
  if [ -n "$DB_PASS" ]; then
    echo -e "${YELLOW}Dumping MariaDB database to $BACKUP_DIR/weatherwatch_mariadb_$TIMESTAMP.sql...${NC}"
    if docker compose ps | grep -q mariadb; then
      # Run mysqldump directly without sh -c to avoid quote mangling
      docker compose exec -T mariadb mysqldump -u root -p"$DB_PASS" weatherwatch > "$BACKUP_DIR/weatherwatch_mariadb_$TIMESTAMP.sql"
      echo -e "${GREEN}✓ MariaDB backup complete!${NC}"
    else
      echo -e "${RED}❌ MariaDB container is not running. Cannot perform backup.${NC}"
    fi
  else
    echo -e "${RED}❌ Could not find MARIADB_ROOT_PASSWORD in .env. Skipping backup.${NC}"
  fi
else
  echo -e "${CYAN}Detecting SQLite configuration...${NC}"
  SQLITE_DB=""
  for candidate in \
    "$ROOT_DIR/backend/data/weatherwatch.db" \
    "$ROOT_DIR/backend/weatherwatch.db" \
    "$ROOT_DIR/backend/prisma/weatherwatch.db"
  do
    if [ -f "$candidate" ]; then
      SQLITE_DB="$candidate"
      break
    fi
  done
  if [ -n "$SQLITE_DB" ]; then
    cp "$SQLITE_DB" "$BACKUP_DIR/weatherwatch_sqlite_$TIMESTAMP.db"
    echo -e "${GREEN}✓ SQLite backup saved to $BACKUP_DIR/weatherwatch_sqlite_$TIMESTAMP.db${NC}"
    echo -e "  (from $SQLITE_DB)"
  else
    echo -e "${YELLOW}⚠️ No SQLite database found under backend/data or backend/. Skipping backup.${NC}"
  fi
fi

# 3. Pull latest changes
echo -e "\n${BLUE}➔ Pulling latest changes from Git...${NC}"
git pull

# 3b. Migrate legacy SQLite path.
# The backend volume used to mount over all of /app, which shadowed the freshly
# built binary. It now mounts /app/data only, so the DB URL must live under it.
if [ -f "$ROOT_DIR/.env" ] && grep -q '^DATABASE_URL=file:/app/weatherwatch.db' "$ROOT_DIR/.env"; then
  echo -e "${YELLOW}➔ Migrating legacy DATABASE_URL to /app/data/weatherwatch.db${NC}"
  sed -i 's|^DATABASE_URL=file:/app/weatherwatch.db|DATABASE_URL=file:/app/data/weatherwatch.db|' "$ROOT_DIR/.env"
  export DATABASE_URL=file:/app/data/weatherwatch.db
  echo -e "${GREEN}✓ .env updated${NC}"
fi

# 4. Rebuild & Restart
echo -e "\n${BLUE}➔ Rebuilding and restarting containers...${NC}"
if [ "$DB_PROVIDER" = "mysql" ]; then
  docker compose --profile mariadb up -d --build
else
  docker compose up -d --build
fi

# 5. Verify the backend actually came up with the new routes
echo -e "\n${BLUE}➔ Verifying backend...${NC}"
BACKEND_URL="http://127.0.0.1:5081"
ok=0
for i in $(seq 1 30); do
  if curl -fsS "$BACKEND_URL/api/health" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 2
done

if [ "$ok" = "1" ]; then
  echo -e "${GREEN}✓ /api/health responding${NC}"
  if curl -fsS "$BACKEND_URL/api/cams" >/dev/null 2>&1; then
    CAM_COUNT=$(curl -fsS "$BACKEND_URL/api/cams" | grep -o '"id":' | wc -l | tr -d ' ')
    echo -e "${GREEN}✓ /api/cams responding ($CAM_COUNT cameras)${NC}"
  else
    echo -e "${RED}❌ /api/cams missing — backend is running an old build.${NC}"
    echo -e "${YELLOW}   Force a clean rebuild:${NC}"
    echo -e "   ${CYAN}docker compose build --no-cache backend && docker compose up -d${NC}"
  fi
else
  echo -e "${RED}❌ Backend did not respond on $BACKEND_URL/api/health${NC}"
  echo -e "${YELLOW}   Check logs: ${CYAN}docker compose logs --tail=80 backend${NC}"
fi

echo -e "\n${CYAN}======================================================${NC}"
echo -e "${GREEN}🎉 Update & Backup Complete!${NC}"
echo -e "${CYAN}======================================================${NC}"
