#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "$(uname -s)" != "Darwin" ]]; then
  printf "\n[orchestrator] Este script é focado em debug local no macOS.\n"
  printf "[orchestrator] Para Linux/Git Bash, use: scripts/unix/start.sh\n"
  exit 1
fi

export ORCHESTRATOR_VERBOSE_LOGS="${ORCHESTRATOR_VERBOSE_LOGS:-1}"
export ORCHESTRATOR_CORE_TRACE="${ORCHESTRATOR_CORE_TRACE:-1}"
export RUST_LOG="${RUST_LOG:-debug}"

exec "$ROOT_DIR/scripts/unix/start.sh"
