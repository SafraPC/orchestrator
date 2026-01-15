#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CORE_DIR="$ROOT_DIR/orchestrator-core"
UI_DIR="$ROOT_DIR/orchestrator-ui"
DESKTOP_DIR="$ROOT_DIR/orchestrator-desktop"

ORCH_DIR="$ROOT_DIR/.orchestrator"
PID_DIR="$ORCH_DIR/pids"
mkdir -p "$PID_DIR"

CORE_PID_FILE="$PID_DIR/core.pid"
UI_PID_FILE="$PID_DIR/ui.pid"

log() { printf "\n[orchestrator] %s\n" "$*"; }

require_cmd() {
  local c="$1"
  if ! command -v "$c" >/dev/null 2>&1; then
    log "ERRO: comando obrigatório não encontrado: ${c}"
    exit 1
  fi
}

ensure_rust_with_brew() {
  if command -v cargo >/dev/null 2>&1; then
    return 0
  fi

  if ! command -v brew >/dev/null 2>&1; then
    log "ERRO: Rust (cargo) não encontrado e Homebrew (brew) não está instalado."
    log "Instale o Homebrew e re-execute o script (ou instale Rust manualmente)."
    exit 1
  fi

  if [[ "$(uname -s)" == "Darwin" ]]; then
    if ! xcode-select -p >/dev/null 2>&1; then
      log "ERRO: Xcode Command Line Tools não encontrado."
      log "Rode: xcode-select --install"
      exit 1
    fi
  fi

  log "Rust toolchain não encontrado (cargo). Instalando via Homebrew (brew install rust)..."
  brew install rust || true

  if ! command -v cargo >/dev/null 2>&1; then
    log "ERRO: não consegui instalar/ativar cargo via brew. Verifique seu Homebrew e tente novamente."
    exit 1
  fi
}

is_pid_alive() {
  local pid="$1"
  [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null
}

wait_for_http() {
  local url="$1"
  local timeout_s="${2:-30}"
  local start
  start="$(date +%s)"
  while true; do
    if command -v curl >/dev/null 2>&1; then
      if curl -fsS "$url" >/dev/null 2>&1; then
        return 0
      fi
    else
      local host port
      host="$(echo "$url" | sed -E 's#https?://([^:/]+).*#\1#')"
      port="$(echo "$url" | sed -E 's#https?://[^:/]+:([0-9]+).*#\1#')"
      port="${port:-80}"
      if (echo >/dev/tcp/"$host"/"$port") >/dev/null 2>&1; then
        return 0
      fi
    fi
    local now
    now="$(date +%s)"
    if (( now - start >= timeout_s )); then
      return 1
    fi
    sleep 0.5
  done
}

build_core() {
  log "Buildando orchestrator-core (jar standalone)..."
  (
    cd "$CORE_DIR"
    mvn -q -DskipTests package
  )
  log "Jar gerado em orchestrator-core/target/orchestrator-core-standalone.jar"
}

start_ui() {
  if [[ -f "$UI_PID_FILE" ]]; then
    local existing
    existing="$(cat "$UI_PID_FILE" 2>/dev/null || true)"
    if is_pid_alive "$existing"; then
      log "UI já está rodando (PID $existing)."
      return 0
    fi
  fi

  log "Iniciando orchestrator-ui (Vite)..."
  (
    cd "$UI_DIR"
    # Garante deps atualizadas (ex: @tauri-apps/api) mesmo se node_modules já existir
    if [[ ! -d node_modules ]]; then
      log "Instalando dependências da UI (npm install)..."
      npm install
    else
      if ! node -e "require('@tauri-apps/api/package.json'); require('@tauri-apps/plugin-dialog/package.json')" >/dev/null 2>&1; then
        log "Dependências Tauri da UI ausentes. Rodando npm install..."
        npm install
      fi
    fi
    mkdir -p "$UI_DIR/dist"
    nohup npm run dev -- --host localhost --port 5173 > "$ORCH_DIR/ui.console.log" 2>&1 &
    echo $! > "$UI_PID_FILE"
  )
  log "UI iniciada (PID $(cat "$UI_PID_FILE"))."
}

cleanup() {
  log "Encerrando processos iniciados pelo start.sh..."

  if [[ -f "$UI_PID_FILE" ]]; then
    local pid
    pid="$(cat "$UI_PID_FILE" 2>/dev/null || true)"
    if is_pid_alive "$pid"; then
      log "Parando UI (PID $pid)..."
      kill "$pid" 2>/dev/null || true
    fi
  fi

  if [[ -f "$CORE_PID_FILE" ]]; then
    local pid
    pid="$(cat "$CORE_PID_FILE" 2>/dev/null || true)"
    if is_pid_alive "$pid"; then
      log "Parando core (PID $pid)..."
      kill "$pid" 2>/dev/null || true
    fi
  fi
}

trap cleanup EXIT INT TERM

require_cmd java
require_cmd mvn
require_cmd npm
ensure_rust_with_brew

build_core
start_ui

log "Abrindo Desktop (Tauri dev)..."
(
  cd "$DESKTOP_DIR"
  if [[ ! -d node_modules ]]; then
    log "Instalando dependências do Desktop (npm install)..."
    npm install
  fi
  SPRING_DEV_ORCHESTRATOR_CORE_JAR="$ROOT_DIR/orchestrator-core/target/orchestrator-core-standalone.jar" npm run tauri:dev
)
