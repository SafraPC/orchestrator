#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Uso: $0 <arquivo.deb>" >&2
  exit 1
fi

DEB="$1"
KEY="${LINUX_GPG_KEY_ID:-${SIGN_KEY:-}}"

if [[ -z "$KEY" ]]; then
  echo "LINUX_GPG_KEY_ID ou SIGN_KEY não definido — pulando assinatura deb" >&2
  exit 0
fi

if ! command -v dpkg-sig >/dev/null 2>&1; then
  echo "dpkg-sig não encontrado — pulando assinatura deb (opcional no Ubuntu 24.04+)" >&2
  exit 0
fi

dpkg-sig -k "$KEY" --sign builder "$DEB"
dpkg-sig --verify "$DEB"
echo "deb assinado: $DEB"
