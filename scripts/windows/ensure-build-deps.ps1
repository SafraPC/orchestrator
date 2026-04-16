$ErrorActionPreference = "Stop"

param(
  [switch]$PersistUserEnvironment
)

$DepsRoot = Join-Path $env:LOCALAPPDATA "OrchestratorBuildDeps"
$TempRoot = Join-Path $env:TEMP "orchestrator-build-deps"
$MavenVersion = "3.9.9"

function Write-Step([string]$Message) {
  Write-Host "[deps] $Message"
}

function Add-PathEntry([string]$CurrentPath, [string]$Entry) {
  if ([string]::IsNullOrWhiteSpace($Entry)) { return $CurrentPath }
  if (-not (Test-Path $Entry)) { return $CurrentPath }
  $parts = @()
  if (-not [string]::IsNullOrWhiteSpace($CurrentPath)) {
    $parts = $CurrentPath -split ";" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  }
  if ($parts -contains $Entry) { return ($parts -join ";") }
  return (@($Entry) + $parts) -join ";"
}

function Set-UserPathEntries([string[]]$Entries) {
  $current = [Environment]::GetEnvironmentVariable("Path", "User")
  foreach ($entry in $Entries) {
    $current = Add-PathEntry $current $entry
  }
  [Environment]::SetEnvironmentVariable("Path", $current, "User")
}

function Invoke-Download([string]$Url, [string]$Destination) {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -Uri $Url -OutFile $Destination -UseBasicParsing
}

function Expand-DownloadedZip([string]$ZipPath) {
  Expand-Archive -LiteralPath $ZipPath -DestinationPath $DepsRoot -Force
  Unblock-PathTree -Path $DepsRoot
}

function Unblock-PathTree([string]$Path) {
  if (-not (Test-Path $Path)) { return }
  Unblock-File -LiteralPath $Path -ErrorAction SilentlyContinue
  Get-ChildItem -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
    if (-not $_.PSIsContainer) {
      $_.Attributes = $_.Attributes -band (-bnot [IO.FileAttributes]::ReadOnly)
    }
    Unblock-File -LiteralPath $_.FullName -ErrorAction SilentlyContinue
  }
}

function Get-LatestChildDir([scriptblock]$Filter) {
  if (-not (Test-Path $DepsRoot)) { return $null }
  Get-ChildItem -LiteralPath $DepsRoot -Directory -ErrorAction SilentlyContinue |
    Where-Object $Filter |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}

function Get-JavaMajor([string]$JavaHome) {
  $javaExe = Join-Path $JavaHome "bin\java.exe"
  if (-not (Test-Path $javaExe)) { return $null }
  try {
    $raw = & $javaExe -version 2>&1 | Out-String
    $match = [regex]::Match($raw, '"(?<major>\d+)(?:\.\d+)?')
    if ($match.Success) {
      return [int]$match.Groups["major"].Value
    }
  } catch {}
  return $null
}

function Resolve-JavaHome {
  $dir = Get-LatestChildDir { (Test-Path (Join-Path $_.FullName "bin\java.exe")) -and (Get-JavaMajor $_.FullName) -ge 17 }
  if ($dir) { return $dir.FullName }
  return $null
}

function Ensure-Java {
  $existing = Resolve-JavaHome
  if ($existing) {
    Write-Step "Java local encontrado em $existing"
    return $existing
  }
  $arch = if ($env:PROCESSOR_ARCHITECTURE -match "ARM64") { "aarch64" } else { "x64" }
  $zipPath = Join-Path $TempRoot "temurin-jdk17-$arch.zip"
  $url = "https://api.adoptium.net/v3/binary/latest/17/ga/windows/$arch/jdk/hotspot/normal/eclipse"
  Write-Step "Baixando Java 17+ ($arch)"
  Invoke-Download -Url $url -Destination $zipPath
  Expand-DownloadedZip -ZipPath $zipPath
  $resolved = Resolve-JavaHome
  if (-not $resolved) {
    throw "Falha ao preparar Java 17+ em $DepsRoot"
  }
  Write-Step "Java preparado em $resolved"
  return $resolved
}

function Resolve-MavenHome {
  $dir = Get-LatestChildDir { $_.Name -like "apache-maven-*" -and (Test-Path (Join-Path $_.FullName "bin\mvn.cmd")) }
  if ($dir) { return $dir.FullName }
  return $null
}

function Ensure-Maven {
  $existing = Resolve-MavenHome
  if ($existing) {
    Write-Step "Maven local encontrado em $existing"
    return $existing
  }
  $zipPath = Join-Path $TempRoot "apache-maven-$MavenVersion-bin.zip"
  $url = "https://archive.apache.org/dist/maven/maven-3/$MavenVersion/binaries/apache-maven-$MavenVersion-bin.zip"
  Write-Step "Baixando Maven $MavenVersion"
  Invoke-Download -Url $url -Destination $zipPath
  Expand-DownloadedZip -ZipPath $zipPath
  $resolved = Resolve-MavenHome
  if (-not $resolved) {
    throw "Falha ao preparar Maven em $DepsRoot"
  }
  Write-Step "Maven preparado em $resolved"
  return $resolved
}

function Resolve-NodeHome {
  $dir = Get-LatestChildDir { $_.Name -like "node-v*" -and (Test-Path (Join-Path $_.FullName "npm.cmd")) }
  if ($dir) { return $dir.FullName }
  return $null
}

function Get-LatestNodeVersion {
  $index = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -UseBasicParsing
  $match = $index |
    Where-Object { $_.version -match '^v20\.' -and $_.lts } |
    Sort-Object { [version]($_.version.TrimStart("v")) } -Descending |
    Select-Object -First 1
  if (-not $match) {
    throw "Não consegui descobrir a última versão LTS do Node 20"
  }
  return $match.version
}

function Ensure-Node {
  $existing = Resolve-NodeHome
  if ($existing) {
    Write-Step "Node local encontrado em $existing"
    return $existing
  }
  $version = Get-LatestNodeVersion
  $arch = if ($env:PROCESSOR_ARCHITECTURE -match "ARM64") { "arm64" } else { "x64" }
  $fileName = "node-$version-win-$arch.zip"
  $zipPath = Join-Path $TempRoot $fileName
  $url = "https://nodejs.org/dist/$version/$fileName"
  Write-Step "Baixando Node $version ($arch)"
  Invoke-Download -Url $url -Destination $zipPath
  Expand-DownloadedZip -ZipPath $zipPath
  $resolved = Resolve-NodeHome
  if (-not $resolved) {
    throw "Falha ao preparar Node em $DepsRoot"
  }
  Write-Step "Node preparado em $resolved"
  return $resolved
}

function Apply-CurrentEnvironment([string]$JavaHome, [string]$MavenHome, [string]$NodeHome) {
  $javaBin = Join-Path $JavaHome "bin"
  $mavenBin = Join-Path $MavenHome "bin"
  $env:JAVA_HOME = $JavaHome
  $env:MAVEN_HOME = $MavenHome
  $env:Path = Add-PathEntry $env:Path $NodeHome
  $env:Path = Add-PathEntry $env:Path $mavenBin
  $env:Path = Add-PathEntry $env:Path $javaBin
}

function Persist-UserEnvironment([string]$JavaHome, [string]$MavenHome, [string]$NodeHome) {
  $javaBin = Join-Path $JavaHome "bin"
  $mavenBin = Join-Path $MavenHome "bin"
  [Environment]::SetEnvironmentVariable("JAVA_HOME", $JavaHome, "User")
  [Environment]::SetEnvironmentVariable("MAVEN_HOME", $MavenHome, "User")
  Set-UserPathEntries -Entries @($NodeHome, $mavenBin, $javaBin)
}

New-Item -ItemType Directory -Path $DepsRoot -Force | Out-Null
New-Item -ItemType Directory -Path $TempRoot -Force | Out-Null

$javaHome = Ensure-Java
$mavenHome = Ensure-Maven
$nodeHome = Ensure-Node

Apply-CurrentEnvironment -JavaHome $javaHome -MavenHome $mavenHome -NodeHome $nodeHome

if ($PersistUserEnvironment) {
  Persist-UserEnvironment -JavaHome $javaHome -MavenHome $mavenHome -NodeHome $nodeHome
}

[pscustomobject]@{
  DepsRoot = $DepsRoot
  JavaHome = $javaHome
  JavaExe = Join-Path $javaHome "bin\java.exe"
  MavenHome = $mavenHome
  MvnCmd = Join-Path $mavenHome "bin\mvn.cmd"
  NodeHome = $nodeHome
  NodeExe = Join-Path $nodeHome "node.exe"
  NpmCmd = Join-Path $nodeHome "npm.cmd"
}
