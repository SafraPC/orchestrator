$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $Root

$DepsInfo = & (Join-Path $Root "scripts\windows\ensure-build-deps.ps1")
$LocalCargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
if (Test-Path (Join-Path $LocalCargoBin "cargo.exe")) {
  if ($env:Path -notlike "*$LocalCargoBin*") {
    $env:Path = "$LocalCargoBin;$env:Path"
  }
}

$NodeExe = $DepsInfo.NodeExe
if (-not (Test-Path $NodeExe)) {
  $g = Get-Command node -ErrorAction SilentlyContinue
  if (-not $g) {
    throw "node nao encontrado. Instale Node.js LTS ou use OrchestratorBuildDeps."
  }
  $NodeExe = $g.Source
}

$env:ORCHESTRATOR_SKIP_MVN_CLEAN = $null
$env:ORCHESTRATOR_VERBOSE_LOGS = "1"

& $NodeExe "$Root\orchestrator-desktop\scripts\run-dev.mjs"
exit $LASTEXITCODE
