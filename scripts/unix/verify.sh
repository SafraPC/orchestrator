#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUN_SMOKE=0

for arg in "$@"; do
  case "$arg" in
    --smoke) RUN_SMOKE=1 ;;
    -h|--help)
      echo "Uso: scripts/unix/verify.sh [--smoke]"
      echo "  Compila core (Maven), frontend (npm build) e Rust (cargo check)."
      echo "  --smoke  roda npm run verify:core-ipc (exige JAR já gerado)."
      exit 0
      ;;
    *)
      echo "Opção desconhecida: $arg" >&2
      exit 1
      ;;
  esac
done

log() { printf "\n[verify] %s\n" "$*"; }

log "Maven compile (orchestrator-core)"
(cd "$ROOT_DIR/orchestrator-core" && mvn -q -DskipTests compile)

log "cargo check (src-tauri)"
(cd "$ROOT_DIR/orchestrator-desktop/src-tauri" && cargo check)

if command -v npm >/dev/null 2>&1; then
  log "npm run build (orchestrator-desktop)"
  (cd "$ROOT_DIR/orchestrator-desktop" && npm run build)
else
  log "npm não encontrado — pulando build do frontend"
fi

if [[ "$RUN_SMOKE" -eq 1 ]]; then
  log "smoke IPC (verify:core-ipc)"
  (cd "$ROOT_DIR/orchestrator-desktop" && npm run verify:core-ipc)
fi

log "OK — verificação concluída"
