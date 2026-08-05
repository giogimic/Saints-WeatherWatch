#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CDN_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"
SUBDOMAIN=""

if [ ! -d "$ROOT_DIR" ]; then
  echo "Project root not found: $ROOT_DIR"
  exit 1
fi

if [ ! -f "$ROOT_DIR/frontend/package.json" ]; then
  echo "Frontend package.json not found. Make sure the Angular app is in frontend/"
  exit 1
fi

if [ ! -f "$ROOT_DIR/backend/go.mod" ]; then
  echo "Backend go.mod not found. Make sure the Go server is in backend/"
  exit 1
fi

if command -v docker >/dev/null 2>&1; then
  DOCKER_OK=1
else
  DOCKER_OK=0
fi

if [ -f "$ROOT_DIR/Caddyfile" ]; then
  echo "Detected Caddyfile at $ROOT_DIR/Caddyfile"
  CADDY_FOUND=1
else
  echo "No Caddyfile found at the repo root."
  CADDY_FOUND=0
fi

if [ $CADDY_FOUND -eq 0 ] && [ $DOCKER_OK -eq 1 ]; then
  echo "Docker is available, but no root Caddyfile was found."
  echo "If your deployment is containerized, make sure the Caddyfile is mounted into the container or generated from the service config."
fi

while [ -z "$SUBDOMAIN" ]; do
  read -rp "Enter the subdomain to use for the live preview (for example: weatherwatch): " SUBDOMAIN
  if [ -z "$SUBDOMAIN" ]; then
    echo "A subdomain is required."
  fi
done

if command -v node >/dev/null 2>&1; then
  echo "Installing frontend dependencies with npm"
  (cd "$CDN_DIR" && npm install)
else
  echo "Node.js is not installed. Install Node.js 20+ before building the frontend."
  exit 1
fi

if command -v go >/dev/null 2>&1; then
  echo "Installing backend dependencies with Go modules"
  (cd "$BACKEND_DIR" && go mod download)
else
  echo "Go is not installed. Install Go 1.22+ before building the backend."
  exit 1
fi

if [ $DOCKER_OK -eq 1 ]; then
  echo "Docker detected. Preferred deployment flow: run the app in a container and update the Caddyfile to match the chosen subdomain."
else
  echo "Docker was not detected. You can still build the frontend/backend locally, but containerized deployment will need Docker installed first."
fi

if [ $CADDY_FOUND -eq 1 ]; then
  echo "Updating Caddyfile with subdomain: $SUBDOMAIN"
  cp "$ROOT_DIR/Caddyfile" "$ROOT_DIR/Caddyfile.bak"
  perl -0pi -e "s#https?://[^\s]+#https://${SUBDOMAIN}.example.com#g" "$ROOT_DIR/Caddyfile" || true
  echo "Preview target will be https://${SUBDOMAIN}.example.com"
else
  echo "No Caddyfile detected. If you are using Docker, place the Caddyfile in the repo root or in the container config and set the host to ${SUBDOMAIN}.example.com."
fi

echo "Building frontend"
(cd "$CDN_DIR" && npm run build)

echo "Testing backend"
(cd "$BACKEND_DIR" && go test ./...)

cat <<EOF

Deployment prep complete.
Next steps:
1. Confirm the Linux server has Node.js, Go, and Docker installed.
2. Use the chosen subdomain: ${SUBDOMAIN}.example.com
3. If you are using Docker, make sure the container mounts or includes the Caddyfile.
4. Redeploy the site with the updated Caddy target.
EOF
