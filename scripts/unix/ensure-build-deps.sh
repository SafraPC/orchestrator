#!/usr/bin/env bash
set -euo pipefail

PERSIST=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --persist) PERSIST=1 ;;
  esac
  shift
done

log() { printf '[deps] %s\n' "$*" >&2; }
require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "comando obrigatório ausente: $1"
    exit 1
  fi
}

OS="$(uname -s)"
ARCH_RAW="$(uname -m)"
case "$ARCH_RAW" in
  arm64|aarch64) JAVA_ARCH="aarch64"; NODE_ARCH="arm64" ;;
  x86_64|amd64) JAVA_ARCH="x64"; NODE_ARCH="x64" ;;
  *) JAVA_ARCH="$ARCH_RAW"; NODE_ARCH="$ARCH_RAW" ;;
esac

case "$OS" in
  Darwin) JAVA_OS="mac"; NODE_OS="darwin" ;;
  Linux) JAVA_OS="linux"; NODE_OS="linux" ;;
  *) log "sistema não suportado: $OS"; exit 1 ;;
esac

DEPS_ROOT="${XDG_DATA_HOME:-$HOME/.local/share}/OrchestratorBuildDeps"
TMP_ROOT="${TMPDIR:-/tmp}/orchestrator-build-deps"
MAVEN_VERSION="3.9.9"

mkdir -p "$DEPS_ROOT" "$TMP_ROOT"

require_cmd curl
require_cmd tar
require_cmd python3

newest_child_dir() {
  local root="$1" prefix="$2" marker="$3"
  python3 - <<'PY' "$root" "$prefix" "$marker"
from pathlib import Path
import sys

root = Path(sys.argv[1])
prefix = sys.argv[2]
marker = sys.argv[3]
if not root.is_dir():
    raise SystemExit(1)
candidates = []
for child in root.iterdir():
    if not child.is_dir():
        continue
    if prefix and not child.name.startswith(prefix):
        continue
    if not (child / marker).exists():
        continue
    candidates.append((child.stat().st_mtime, str(child)))
if not candidates:
    raise SystemExit(1)
candidates.sort(reverse=True)
print(candidates[0][1])
PY
}

find_java_home() {
  python3 - <<'PY' "$DEPS_ROOT"
from pathlib import Path
import sys

root = Path(sys.argv[1])
homes = []
if root.is_dir():
    for child in root.iterdir():
        if not child.is_dir():
            continue
        direct = child / "bin" / "java"
        bundle = child / "Contents" / "Home" / "bin" / "java"
        if direct.is_file():
            homes.append((child.stat().st_mtime, str(child)))
        elif bundle.is_file():
            homes.append((child.stat().st_mtime, str(child / "Contents" / "Home")))
if not homes:
    raise SystemExit(1)
homes.sort(reverse=True)
print(homes[0][1])
PY
}

unpack_archive() {
  local archive="$1"
  case "$archive" in
    *.tar.gz|*.tgz) tar -xzf "$archive" -C "$DEPS_ROOT" ;;
    *.tar.xz) tar -xJf "$archive" -C "$DEPS_ROOT" ;;
    *) log "arquivo não suportado: $archive"; exit 1 ;;
  esac
}

ensure_java() {
  local existing
  if existing="$(find_java_home 2>/dev/null)"; then
    log "Java local encontrado em $existing"
    printf '%s\n' "$existing"
    return
  fi
  local archive="$TMP_ROOT/jdk17-${JAVA_OS}-${JAVA_ARCH}.tar.gz"
  local url="https://api.adoptium.net/v3/binary/latest/17/ga/${JAVA_OS}/${JAVA_ARCH}/jdk/hotspot/normal/eclipse"
  log "baixando Java 17+ (${JAVA_OS}/${JAVA_ARCH})"
  curl -fsSL "$url" -o "$archive"
  unpack_archive "$archive"
  local resolved
  resolved="$(find_java_home)"
  log "Java preparado em $resolved"
  printf '%s\n' "$resolved"
}

ensure_maven() {
  local existing
  if existing="$(newest_child_dir "$DEPS_ROOT" "apache-maven-" "bin/mvn" 2>/dev/null)"; then
    log "Maven local encontrado em $existing"
    printf '%s\n' "$existing"
    return
  fi
  local archive="$TMP_ROOT/apache-maven-${MAVEN_VERSION}-bin.tar.gz"
  local url="https://archive.apache.org/dist/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz"
  log "baixando Maven ${MAVEN_VERSION}"
  curl -fsSL "$url" -o "$archive"
  unpack_archive "$archive"
  local resolved
  resolved="$(newest_child_dir "$DEPS_ROOT" "apache-maven-" "bin/mvn")"
  log "Maven preparado em $resolved"
  printf '%s\n' "$resolved"
}

latest_node_version() {
  python3 - <<'PY' "$TMP_ROOT/node-index.json"
from pathlib import Path
import json
import sys

data = json.loads(Path(sys.argv[1]).read_text())
versions = []
for item in data:
    version = item.get("version", "")
    if version.startswith("v20.") and item.get("lts"):
        versions.append(version)
if not versions:
    raise SystemExit(1)
versions.sort(key=lambda value: tuple(int(part) for part in value[1:].split(".")), reverse=True)
print(versions[0])
PY
}

ensure_node() {
  local existing
  if existing="$(newest_child_dir "$DEPS_ROOT" "node-v" "bin/node" 2>/dev/null)"; then
    log "Node local encontrado em $existing"
    printf '%s\n' "$existing"
    return
  fi
  local index_json="$TMP_ROOT/node-index.json"
  curl -fsSL "https://nodejs.org/dist/index.json" -o "$index_json"
  local version
  version="$(latest_node_version)"
  local archive="node-${version}-${NODE_OS}-${NODE_ARCH}.tar.xz"
  local archive_path="$TMP_ROOT/${archive}"
  local url="https://nodejs.org/dist/${version}/${archive}"
  log "baixando Node ${version} (${NODE_ARCH})"
  curl -fsSL "$url" -o "$archive_path"
  unpack_archive "$archive_path"
  local resolved
  resolved="$(newest_child_dir "$DEPS_ROOT" "node-v" "bin/node")"
  log "Node preparado em $resolved"
  printf '%s\n' "$resolved"
}

add_path_entry() {
  python3 - <<'PY' "${1:-}" "${2:-}"
import os
import sys

current = sys.argv[1]
entry = sys.argv[2]
parts = [part for part in current.split(os.pathsep) if part]
if entry and entry not in parts:
    parts.insert(0, entry)
print(os.pathsep.join(parts))
PY
}

persist_env() {
  local java_home="$1" maven_home="$2" node_home="$3"
  local shell_name rc_file
  shell_name="$(basename "${SHELL:-}")"
  if [[ "$shell_name" == "zsh" ]]; then
    rc_file="$HOME/.zshrc"
  elif [[ "$shell_name" == "bash" ]]; then
    rc_file="$HOME/.bashrc"
  else
    rc_file="$HOME/.profile"
  fi
  local begin="# >>> orchestrator deps >>>"
  local end="# <<< orchestrator deps <<<"
  mkdir -p "$(dirname "$rc_file")"
  touch "$rc_file"
  python3 - <<'PY' "$rc_file" "$begin" "$end"
from pathlib import Path
import sys

path = Path(sys.argv[1])
begin = sys.argv[2]
end = sys.argv[3]
content = path.read_text() if path.exists() else ""
if begin in content and end in content:
    start = content.index(begin)
    finish = content.index(end) + len(end)
    content = (content[:start] + content[finish:]).rstrip() + "\n"
path.write_text(content)
PY
  {
    printf '\n%s\n' "$begin"
    printf 'export JAVA_HOME="%s"\n' "$java_home"
    printf 'export MAVEN_HOME="%s"\n' "$maven_home"
    printf 'export PATH="%s/bin:%s/bin:%s/bin:$PATH"\n' "$node_home" "$maven_home" "$java_home"
    printf '%s\n' "$end"
  } >> "$rc_file"
  log "variáveis persistidas em $rc_file"
}

JAVA_HOME_LOCAL="$(ensure_java)"
MAVEN_HOME_LOCAL="$(ensure_maven)"
NODE_HOME_LOCAL="$(ensure_node)"
PATH_VALUE="${PATH:-}"
PATH_VALUE="$(add_path_entry "$PATH_VALUE" "$NODE_HOME_LOCAL/bin")"
PATH_VALUE="$(add_path_entry "$PATH_VALUE" "$MAVEN_HOME_LOCAL/bin")"
PATH_VALUE="$(add_path_entry "$PATH_VALUE" "$JAVA_HOME_LOCAL/bin")"

if [[ "$PERSIST" == "1" ]]; then
  persist_env "$JAVA_HOME_LOCAL" "$MAVEN_HOME_LOCAL" "$NODE_HOME_LOCAL"
fi

printf 'export ORCHESTRATOR_DEPS_ROOT=%q\n' "$DEPS_ROOT"
printf 'export JAVA_HOME=%q\n' "$JAVA_HOME_LOCAL"
printf 'export MAVEN_HOME=%q\n' "$MAVEN_HOME_LOCAL"
printf 'export PATH=%q\n' "$PATH_VALUE"
printf 'export ORCHESTRATOR_NODE_HOME=%q\n' "$NODE_HOME_LOCAL"
