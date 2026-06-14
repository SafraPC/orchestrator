param(
  [switch]$Smoke
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

function Log($msg) { Write-Host "`n[verify] $msg" }

Log "Maven compile (orchestrator-core)"
Push-Location (Join-Path $Root "orchestrator-core")
try { mvn -q -DskipTests compile }
finally { Pop-Location }

Log "cargo check (src-tauri)"
Push-Location (Join-Path $Root "orchestrator-desktop\src-tauri")
try { cargo check }
finally { Pop-Location }

if (Get-Command npm -ErrorAction SilentlyContinue) {
  Log "npm run build (orchestrator-desktop)"
  Push-Location (Join-Path $Root "orchestrator-desktop")
  try { npm run build }
  finally { Pop-Location }
} else {
  Log "npm não encontrado — pulando build do frontend"
}

if ($Smoke) {
  Log "smoke IPC (verify:core-ipc)"
  Push-Location (Join-Path $Root "orchestrator-desktop")
  try { npm run verify:core-ipc }
  finally { Pop-Location }
}

Log "OK — verificação concluída"
