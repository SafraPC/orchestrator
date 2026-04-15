$ErrorActionPreference = "Stop"

$Repo = if ($env:REPO) { $env:REPO } else { "SafraPC/spring-dev-orchestrator" }
$ApiUrl = "https://api.github.com/repos/$Repo/releases/latest"
$TempDir = Join-Path $env:TEMP "spring-dev-orchestrator-install"
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

Write-Host "[install] Buscando release mais recente: $Repo"
$Release = Invoke-RestMethod -Uri $ApiUrl
$Assets = $Release.assets

$ArchRaw = $env:PROCESSOR_ARCHITECTURE
$Arch = if ($ArchRaw -match "ARM64") { "arm64" } else { "x64" }
Write-Host "[install] Detectado Windows $Arch"

function Get-Score([string]$Name, [string]$Arch) {
  $n = $Name.ToLowerInvariant()
  $score = 0
  if ($n.EndsWith(".msi")) { $score += 100 }
  if ($n.EndsWith(".exe")) { $score += 90 }
  if ($Arch -eq "arm64" -and ($n.Contains("arm64") -or $n.Contains("aarch64"))) { $score += 50 }
  if ($Arch -eq "x64" -and ($n.Contains("x64") -or $n.Contains("x86_64") -or $n.Contains("amd64"))) { $score += 50 }
  return $score
}

$Best = $null
$BestScore = -1
foreach ($Asset in $Assets) {
  $score = Get-Score -Name $Asset.name -Arch $Arch
  if ($score -gt $BestScore) {
    $Best = $Asset
    $BestScore = $score
  }
}

if (-not $Best -or $BestScore -le 0) {
  throw "[install] Nenhum instalador Windows compatível encontrado."
}

$DownloadPath = Join-Path $TempDir $Best.name
Write-Host "[install] Baixando $($Best.name)"
Invoke-WebRequest -Uri $Best.browser_download_url -OutFile $DownloadPath

if ($DownloadPath.ToLowerInvariant().EndsWith(".msi")) {
  Write-Host "[install] Executando instalador MSI"
  Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$DownloadPath`" /passive /norestart" -Wait
} else {
  Write-Host "[install] Executando instalador EXE"
  Start-Process -FilePath $DownloadPath -Wait
}

Write-Host "[install] Instalação concluída."
Write-Host "[install] Dados persistentes: $env:APPDATA\\dev.safra.spring-dev-orchestrator\\spring-dev-orchestrator\\core"
