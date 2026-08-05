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
  if [ -f "$ROOT_DIR/backend/weatherwatch.db" ]; then
    cp "$ROOT_DIR/backend/weatherwatch.db" "$BACKUP_DIR/weatherwatch_sqlite_$TIMESTAMP.db"
    echo -e "${GREEN}✓ SQLite backup saved to $BACKUP_DIR/weatherwatch_sqlite_$TIMESTAMP.db!${NC}"
  else
    echo -e "${YELLOW}⚠️ No SQLite database found at $ROOT_DIR/backend/weatherwatch.db. Skipping backup.${NC}"
  fi
fi

# 3. Pull latest changes
echo -e "\n${BLUE}➔ Pulling latest changes from Git...${NC}"
git pull

# 4. Rebuild & Restart
echo -e "\n${BLUE}➔ Rebuilding and restarting containers...${NC}"
if [ "$DB_PROVIDER" = "mysql" ]; then
  docker compose --profile mariadb up -d --build
else
  docker compose up -d --build
fi

echo -e "\n${CYAN}======================================================${NC}"
echo -e "${GREEN}🎉 Update & Backup Complete!${NC}"
echo -e "${CYAN}======================================================${NC}"
