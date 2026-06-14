#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="${1:-$ROOT_DIR/CHECKSUMS.sha256}"

shopt -s nullglob
files=(
  "$ROOT_DIR"/orchestrator-desktop/src-tauri/target/release/bundle/msi/*.msi
  "$ROOT_DIR"/orchestrator-desktop/src-tauri/target/release/bundle/nsis/*.exe
  "$ROOT_DIR"/orchestrator-desktop/src-tauri/target/release/bundle/deb/*.deb
  "$ROOT_DIR"/orchestrator-desktop/src-tauri/target/release/bundle/appimage/*.AppImage
  "$ROOT_DIR"/orchestrator-desktop/src-tauri/target/release/bundle/dmg/*.dmg
)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "Nenhum instalador encontrado em src-tauri/target/release/bundle/" >&2
  exit 1
fi

{
  for f in "${files[@]}"; do
    if command -v sha256sum >/dev/null 2>&1; then
      sha256sum "$f"
    else
      shasum -a 256 "$f"
    fi
  done
} | sed "s|$ROOT_DIR/||g" > "$OUT"

echo "Gerado: $OUT"
cat "$OUT"
