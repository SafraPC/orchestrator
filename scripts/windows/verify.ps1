param(
  [switch]$Smoke
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

function Log($msg) { Write-Host "`n[verify] $msg" }

Log "Maven package (orchestrator-core)"
Push-Location (Join-Path $Root "orchestrator-core")
try { mvn -q -DskipTests package }
finally { Pop-Location }

Copy-Item -Force `
  (Join-Path $Root "orchestrator-core\target\orchestrator-core-standalone.jar") `
  (Join-Path $Root "orchestrator-desktop\src-tauri\orchestrator-core-standalone.jar")

if (Get-Command npm -ErrorAction SilentlyContinue) {
  Log "npm run build (orchestrator-desktop)"
  Push-Location (Join-Path $Root "orchestrator-desktop")
  try { npm run build }
  finally { Pop-Location }
} else {
  Log "npm não encontrado — pulando build do frontend"
}

Log "cargo check (src-tauri)"
Push-Location (Join-Path $Root "orchestrator-desktop\src-tauri")
try { cargo check }
finally { Pop-Location }

if ($Smoke) {
  Log "smoke IPC (verify:core-ipc)"
  Push-Location (Join-Path $Root "orchestrator-desktop")
  try { npm run verify:core-ipc }
  finally { Pop-Location }
}

Log "OK — verificação concluída"
