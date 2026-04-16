#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPS_HELPER="$ROOT_DIR/scripts/unix/ensure-build-deps.sh"

if [[ -x "$DEPS_HELPER" ]]; then
  eval "$("$DEPS_HELPER")"
fi

if ! command -v node >/dev/null 2>&1; then
  printf "\n[orchestrator] ERRO: comando obrigatório não encontrado: node\n"
  exit 1
fi

unset ORCHESTRATOR_SKIP_MVN_CLEAN
export ORCHESTRATOR_VERBOSE_LOGS="${ORCHESTRATOR_VERBOSE_LOGS:-1}"

exec node "$ROOT_DIR/orchestrator-desktop/scripts/run-dev.mjs"
