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
SUBDOMAIN=""

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

if [ ! -f "$ROOT_DIR/Caddyfile" ]; then
  echo -e "${RED}❌ Error: Caddyfile not found in $ROOT_DIR${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Docker detected${NC}"
echo -e "${GREEN}✓ Compose config found${NC}"
echo -e "${GREEN}✓ Caddyfile found${NC}\n"

# --- Prompt for Database ---
echo -e "${BLUE}Which Database Engine would you like to use?${NC}"
echo -e "  [1] SQLite  (Simple, file-based, great for development)"
echo -e "  [2] MariaDB (Robust, scalable, runs in a container)"
read -rp "> " DB_CHOICE

echo -e "\n${BLUE}Generating .env configuration...${NC}"
if [ "$DB_CHOICE" = "2" ]; then
  echo -e "${GREEN}✓ Selected MariaDB${NC}"
  # Generate a random password for root
  RANDOM_PASS=$(openssl rand -hex 12)
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

# --- Prompt for Subdomain ---
echo ""
while [ -z "$SUBDOMAIN" ]; do
  echo -e "${YELLOW}Please enter the target subdomain (e.g., 'weather' for weather.saintsgamingweb.com):${NC}"
  read -rp "> " SUBDOMAIN
  if [ -z "$SUBDOMAIN" ]; then
    echo -e "${RED}A subdomain is required!${NC}"
  fi
done

FULL_DOMAIN="${SUBDOMAIN}.saintsgamingweb.com"
echo -e "\n${BLUE}➔ Configuring Caddy for: ${CYAN}https://${FULL_DOMAIN}${NC}"

# --- Configure Caddyfile ---
# Back up original Caddyfile just in case
cp "$ROOT_DIR/Caddyfile" "$ROOT_DIR/Caddyfile.bak"

# Use perl to replace the first line domain (or any domain matching *.saintsgamingweb.com)
perl -0pi -e "s#^[^\s]+\.saintsgamingweb\.com#${FULL_DOMAIN}#g" "$ROOT_DIR/Caddyfile" || true

echo -e "${GREEN}✓ Caddyfile updated successfully.${NC}\n"

# --- Launch Docker Compose ---
echo -e "${BLUE}➔ Launching Docker containers...${NC}"
echo -e "${YELLOW}(This may take a minute if building images for the first time)${NC}\n"

eval "$COMPOSE_CMD"

echo -e "\n${CYAN}======================================================${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${CYAN}======================================================${NC}"
echo -e "Your WeatherWatch cluster is spinning up."
echo -e "It will be available shortly at: ${YELLOW}https://${FULL_DOMAIN}${NC}"
echo -e "Run '${CYAN}docker compose logs -f${NC}' to view live logs."
