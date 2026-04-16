param(
  [switch]$CleanTauriTarget
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$CoreDir = Join-Path $Root "orchestrator-core"
$DesktopDir = Join-Path $Root "orchestrator-desktop"
$JarPath = Join-Path $CoreDir "target\orchestrator-core-standalone.jar"
$JarDest = Join-Path $DesktopDir "src-tauri\orchestrator-core-standalone.jar"

function Resolve-Mvn {
  $g = Get-Command mvn -ErrorAction SilentlyContinue
  if ($g) {
    return $g.Source
  }
  if ($env:MAVEN_HOME) {
    $p = Join-Path $env:MAVEN_HOME "bin\mvn.cmd"
    if (Test-Path $p) {
      return $p
    }
  }
  foreach ($p in @(
      "$env:ProgramFiles\Apache\maven\bin\mvn.cmd",
      "$env:USERPROFILE\scoop\apps\maven\current\bin\mvn.cmd"
    )) {
    if (Test-Path $p) {
      return $p
    }
  }
  $chocoLib = "$env:ProgramData\chocolatey\lib\maven"
  if (Test-Path $chocoLib) {
    $found = Get-ChildItem -Path $chocoLib -Filter "mvn.cmd" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
      return $found.FullName
    }
  }
  return $null
}

function Resolve-Npm {
  $g = Get-Command npm -ErrorAction SilentlyContinue
  if ($g) {
    return $g.Source
  }
  foreach ($p in @(
      "$env:ProgramFiles\nodejs\npm.cmd",
      "${env:ProgramFiles(x86)}\nodejs\npm.cmd"
    )) {
    if (Test-Path $p) {
      return $p
    }
  }
  $fnmNpm = Join-Path $env:USERPROFILE ".fnm\aliases\default\npm.cmd"
  if (Test-Path $fnmNpm) {
    return $fnmNpm
  }
  return $null
}

function Resolve-Cargo {
  $g = Get-Command cargo -ErrorAction SilentlyContinue
  if ($g) {
    return $g.Source
  }
  $c = Join-Path $env:USERPROFILE ".cargo\bin\cargo.exe"
  if (Test-Path $c) {
    return $c
  }
  return $null
}

Write-Host ""
Write-Host "[build] === Build do Orchestrator ==="

$DepsTool = Join-Path $Root "scripts\windows\ensure-build-deps.ps1"
$DepsInfo = & $DepsTool
Write-Host "[build] Java: $($DepsInfo.JavaExe)"
Write-Host "[build] Maven local: $($DepsInfo.MvnCmd)"
Write-Host "[build] Node local: $($DepsInfo.NpmCmd)"

$Mvn = Resolve-Mvn
if (-not $Mvn) {
  $Mvn = $DepsInfo.MvnCmd
}
Write-Host "[build] Maven: $Mvn"

$Npm = Resolve-Npm
if (-not $Npm) {
  $Npm = $DepsInfo.NpmCmd
}
Write-Host "[build] npm: $Npm"

$Cargo = Resolve-Cargo
if (-not $Cargo) {
  throw "cargo nao encontrado. Instale Rust (rustup) ou abra um terminal onde cargo funcione."
}
Write-Host "[build] cargo: $Cargo"
$cargoBin = Split-Path -Parent $Cargo
if ($env:Path -notlike "*$cargoBin*") {
  $env:Path = "$cargoBin;$env:Path"
}

Write-Host "[build] 1. Compilando orchestrator-core (JAR)..."
Push-Location $CoreDir
try {
  & $Mvn -q -DskipTests clean package
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}
if (-not (Test-Path $JarPath)) {
  throw "JAR nao foi gerado em $JarPath"
}
Write-Host "[build] OK JAR: $JarPath"

Write-Host "[build] 2. Copiando JAR para o bundle do Tauri..."
Copy-Item -Path $JarPath -Destination $JarDest -Force
Write-Host "[build] OK copiado para: $JarDest"

Write-Host "[build] 3. Buildando frontend + desktop (Tauri)..."
$TauriDir = Join-Path $DesktopDir "src-tauri"
if ($CleanTauriTarget -or $env:ORCHESTRATOR_CLEAN_TAURI_TARGET -eq "1") {
  Write-Host "[build] Limpando target Rust em src-tauri (param -CleanTauriTarget ou env ORCHESTRATOR_CLEAN_TAURI_TARGET=1)..."
  Push-Location $TauriDir
  try {
    & $Cargo clean
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  } finally {
    Pop-Location
  }
}
Push-Location $DesktopDir
try {
  if (-not (Test-Path "node_modules")) {
    Write-Host "[build] npm install..."
    & $Npm install
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  }
  & $Npm run build
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
  & $Npm run tauri:build
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}

$Bundle = Join-Path $DesktopDir "src-tauri\target\release\bundle\"
Write-Host ""
Write-Host "[build] Build completo."
Write-Host "[build] Instaladores em: $Bundle"
