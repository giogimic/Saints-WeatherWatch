#!/usr/bin/env bash
# Start the Windows backend binary (server.exe) under Wine on Linux.
# Prefer Docker (`./update.sh`) when possible — it builds a native Linux binary.
# Use this only when you intentionally want to run backend/server.exe outside containers.
set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
EXE="$BACKEND_DIR/server.exe"
WINEPREFIX_DIR="${WINEPREFIX:-$ROOT_DIR/.wine-weatherwatch}"
PID_FILE="$BACKEND_DIR/server.wine.pid"
LOG_FILE="$BACKEND_DIR/server.wine.log"

usage() {
  cat <<EOF
Usage: $(basename "$0") [start|stop|restart|status|logs]

  start    Launch server.exe under Wine (default)
  stop     Stop a background Wine backend started by this script
  restart  stop + start
  status   Show whether the Wine backend looks alive
  logs     Tail the Wine backend log

Env:
  WINEPREFIX   Wine prefix path (default: $ROOT_DIR/.wine-weatherwatch)
  PORT         Backend listen port (default: 8080)
  DATABASE_URL SQLite/MySQL URL (default: file:./data/weatherwatch.db)
  WINE_BIN     wine binary override (auto-detects wine64/wine)
  FOREGROUND=1 Run in foreground instead of background
EOF
}

pick_wine() {
  if [ -n "${WINE_BIN:-}" ]; then
    command -v "$WINE_BIN" >/dev/null 2>&1 || {
      echo -e "${RED}❌ WINE_BIN=$WINE_BIN not found${NC}"
      exit 1
    }
    echo "$WINE_BIN"
    return
  fi
  if command -v wine64 >/dev/null 2>&1; then
    echo wine64
  elif command -v wine >/dev/null 2>&1; then
    echo wine
  else
    echo -e "${RED}❌ Wine is not installed.${NC}"
    echo -e "On Debian/Ubuntu: ${CYAN}sudo apt install wine64${NC}"
    echo -e "Or use Docker instead: ${CYAN}./update.sh${NC}"
    exit 1
  fi
}

load_env() {
  # Prefer root .env, then backend/.env
  for f in "$ROOT_DIR/.env" "$BACKEND_DIR/.env"; do
    if [ -f "$f" ]; then
      while IFS= read -r line || [ -n "$line" ]; do
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line//[[:space:]]/}" ]] && continue
        clean_line="${line%$'\r'}"
        # Only export KEY=VALUE forms
        if [[ "$clean_line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
          export "$clean_line"
        fi
      done < "$f"
    fi
  done

  export PORT="${PORT:-8080}"
  export DATABASE_URL="${DATABASE_URL:-file:./data/weatherwatch.db}"
  export ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://localhost:4200,http://127.0.0.1:4200,http://localhost:5080}"
  export USER_AGENT="${USER_AGENT:-SaintsWeatherWatch/1.0 (saintsweatherwatch.app)}"
}

ensure_exe() {
  if [ ! -f "$EXE" ]; then
    echo -e "${RED}❌ Missing $EXE${NC}"
    echo -e "Build it on Windows (${CYAN}go build -o server.exe ./cmd/server${NC})"
    echo -e "or use Docker which builds a Linux binary: ${CYAN}./update.sh${NC}"
    exit 1
  fi
}

ensure_data_dir() {
  mkdir -p "$BACKEND_DIR/data"
}

is_running() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid="$(cat "$PID_FILE" 2>/dev/null || true)"
    if [ -n "${pid:-}" ] && kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

cmd_stop() {
  if ! is_running; then
    echo -e "${YELLOW}Wine backend is not running (no live pid).${NC}"
    rm -f "$PID_FILE"
    # Best-effort: kill stray wine processes for this exe
    pkill -f "wine.*server.exe" 2>/dev/null || true
    return 0
  fi
  local pid
  pid="$(cat "$PID_FILE")"
  echo -e "${BLUE}➔ Stopping Wine backend (pid $pid)...${NC}"
  kill "$pid" 2>/dev/null || true
  sleep 1
  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null || true
  fi
  pkill -f "wine.*server.exe" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo -e "${GREEN}✓ Stopped${NC}"
}

cmd_status() {
  if is_running; then
    echo -e "${GREEN}✓ Running${NC} (pid $(cat "$PID_FILE"))"
    echo -e "  log: $LOG_FILE"
    echo -e "  health: http://127.0.0.1:${PORT:-8080}/api/health"
  else
    echo -e "${YELLOW}Not running${NC}"
    exit 1
  fi
}

cmd_logs() {
  touch "$LOG_FILE"
  tail -n 100 -f "$LOG_FILE"
}

cmd_start() {
  local wine_bin
  wine_bin="$(pick_wine)"
  load_env
  ensure_exe
  ensure_data_dir

  if is_running; then
    echo -e "${YELLOW}Already running (pid $(cat "$PID_FILE")). Use: $0 restart${NC}"
    exit 0
  fi

  export WINEPREFIX="$WINEPREFIX_DIR"
  export WINEDEBUG="${WINEDEBUG:--all}"
  mkdir -p "$WINEPREFIX_DIR"

  # First-run prefix init (quiet). Ignore failures from GUI stubs.
  if [ ! -d "$WINEPREFIX_DIR/drive_c" ]; then
    echo -e "${BLUE}➔ Initializing Wine prefix at $WINEPREFIX_DIR ...${NC}"
    "$wine_bin" wineboot --init >/dev/null 2>&1 || true
  fi

  echo -e "${CYAN}======================================================${NC}"
  echo -e "${CYAN}🍷 WeatherWatch backend via Wine${NC}"
  echo -e "${CYAN}======================================================${NC}"
  echo -e "  exe:  $EXE"
  echo -e "  wine: $wine_bin"
  echo -e "  port: $PORT"
  echo -e "  db:   $DATABASE_URL"
  echo -e "  cwd:  $BACKEND_DIR"
  echo -e "${YELLOW}Note: Prisma's Windows query engine must run under Wine too.${NC}"
  echo -e "${YELLOW}If this flakes, use Docker: ./update.sh${NC}\n"

  cd "$BACKEND_DIR"

  if [ "${FOREGROUND:-0}" = "1" ]; then
    exec env PORT="$PORT" DATABASE_URL="$DATABASE_URL" ALLOWED_ORIGINS="$ALLOWED_ORIGINS" USER_AGENT="$USER_AGENT" \
      "$wine_bin" "$EXE"
  fi

  # Background
  nohup env PORT="$PORT" DATABASE_URL="$DATABASE_URL" ALLOWED_ORIGINS="$ALLOWED_ORIGINS" USER_AGENT="$USER_AGENT" \
    "$wine_bin" "$EXE" >>"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  sleep 2

  if is_running; then
    echo -e "${GREEN}✓ Started${NC} (pid $(cat "$PID_FILE"))"
    echo -e "  logs:   ${CYAN}$0 logs${NC}"
    echo -e "  health: ${CYAN}curl -s http://127.0.0.1:$PORT/api/health${NC}"
  else
    echo -e "${RED}❌ Failed to stay up. Last log lines:${NC}"
    tail -n 40 "$LOG_FILE" || true
    rm -f "$PID_FILE"
    exit 1
  fi
}

ACTION="${1:-start}"
case "$ACTION" in
  start) cmd_start ;;
  stop) cmd_stop ;;
  restart) cmd_stop; cmd_start ;;
  status) load_env; cmd_status ;;
  logs) cmd_logs ;;
  -h|--help|help) usage ;;
  *)
    echo -e "${RED}Unknown command: $ACTION${NC}"
    usage
    exit 1
    ;;
esac
