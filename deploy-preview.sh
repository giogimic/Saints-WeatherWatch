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
echo -e "${CYAN}🚀 SaintsGamingweb - WeatherWatch Deployment Script 🚀${NC}"
echo -e "${CYAN}======================================================${NC}\n"

# --- Pre-flight Checks ---
if ! command -v docker >/dev/null 2>&1; then
  echo -e "${RED}❌ Error: Docker is not installed or not in PATH.${NC}"
  echo -e "Please install Docker and Docker Compose before deploying."
  exit 1
fi

if [ ! -f "$ROOT_DIR/docker-compose.yml" ]; then
  echo -e "${RED}❌ Error: docker-compose.yml not found in $ROOT_DIR${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Docker detected${NC}"
echo -e "${GREEN}✓ Compose config found${NC}\n"

# --- Prompt for Database ---
echo -e "${BLUE}Which Database Engine would you like to use?${NC}"
echo -e "  [1] SQLite  (Simple, file-based, great for development)"
echo -e "  [2] MariaDB (Robust, scalable, runs in a container)"
read -rp "> " DB_CHOICE

echo -e "\n${BLUE}Generating .env configuration...${NC}"
if [ "$DB_CHOICE" = "2" ]; then
  echo -e "${GREEN}✓ Selected MariaDB${NC}"
  # Reuse existing password if .env exists to prevent database lockouts
  EXISTING_PASS=""
  if [ -f "$ROOT_DIR/.env" ]; then
    EXISTING_PASS=$(grep '^MARIADB_ROOT_PASSWORD=' "$ROOT_DIR/.env" | cut -d '=' -f2 | tr -d '\r')
  fi
  
  if [ -n "$EXISTING_PASS" ]; then
    RANDOM_PASS=$EXISTING_PASS
    echo -e "${YELLOW}Reusing existing MariaDB password from .env${NC}"
  else
    RANDOM_PASS=$(openssl rand -hex 12)
  fi

  cat <<EOF > "$ROOT_DIR/.env"
DB_PROVIDER=mysql
DATABASE_URL=mysql://root:${RANDOM_PASS}@mariadb:3306/weatherwatch
MARIADB_ROOT_PASSWORD=${RANDOM_PASS}
COMPOSE_PROFILES=mariadb
EOF
  COMPOSE_CMD="docker compose --profile mariadb up -d --build"
else
  echo -e "${GREEN}✓ Selected SQLite${NC}"
  cat <<EOF > "$ROOT_DIR/.env"
DB_PROVIDER=sqlite
DATABASE_URL=file:/app/weatherwatch.db
COMPOSE_PROFILES=
EOF
  COMPOSE_CMD="docker compose up -d --build"
fi

# --- Launch Docker Compose ---
echo -e "\n${BLUE}➔ Launching Docker containers...${NC}"
echo -e "${YELLOW}(This may take a minute if building images for the first time)${NC}\n"

eval "$COMPOSE_CMD"

echo -e "\n${CYAN}======================================================${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${CYAN}======================================================${NC}"
echo -e "Your WeatherWatch cluster is spinning up and exposed to the host system:"
echo -e "  ➔ ${YELLOW}Frontend Application:${NC} http://localhost:5080"
echo -e "  ➔ ${YELLOW}Backend API Server:${NC}   http://localhost:5081"
echo -e ""
echo -e "Please configure your master SaintsGamingweb proxy to route traffic to these ports."
echo -e "Run '${CYAN}docker compose logs -f${NC}' to view live logs."
