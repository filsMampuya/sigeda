param(
  [string]$HostName = "sigeda-preprod.hdm",
  [string]$ServerIp = ""
)

$ErrorActionPreference = "Stop"

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Ensure-RegistryKey {
  param([string]$Path)
  $nativePath = $Path -replace '^HKLM:\\', 'HKLM\' -replace '^HKCU:\\', 'HKCU\'
  & reg.exe add $nativePath /f | Out-Null
}

function Set-StringPolicy {
  param(
    [string]$Path,
    [string]$Name,
    [string]$Value
  )
  $nativePath = $Path -replace '^HKLM:\\', 'HKLM\' -replace '^HKCU:\\', 'HKCU\'
  & reg.exe add $nativePath /v $Name /t REG_SZ /d $Value /f | Out-Null
}

function Set-DwordPolicy {
  param(
    [string]$Path,
    [string]$Name,
    [int]$Value
  )
  $nativePath = $Path -replace '^HKLM:\\', 'HKLM\' -replace '^HKCU:\\', 'HKCU\'
  & reg.exe add $nativePath /v $Name /t REG_DWORD /d $Value /f | Out-Null
}

function Resolve-ServerIp {
  param([string]$Candidate)

  if (-not [string]::IsNullOrWhiteSpace($Candidate)) {
    return $Candidate.Trim()
  }

  $detectedIp = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -and
      $_.IPAddress -notlike "127.*" -and
      $_.IPAddress -notlike "169.254.*" -and
      $_.InterfaceAlias -notmatch "Loopback|vEthernet|WSL|Docker|VirtualBox|VMware"
    } |
    Sort-Object -Property InterfaceMetric, SkipAsSource, PrefixOrigin |
    Select-Object -First 1 -ExpandProperty IPAddress

  if (-not $detectedIp) {
    throw "Impossible de determiner automatiquement l'adresse IPv4 du serveur. Relancez le script avec -ServerIp <adresse-ip>."
  }

  return $detectedIp
}

if (-not (Test-IsAdministrator)) {
  throw "Ce script doit etre lance en administrateur."
}

$ServerIp = Resolve-ServerIp -Candidate $ServerIp
$bypassList = @(
  $HostName,
  $ServerIp,
  "127.0.0.1",
  "localhost",
  "<local>"
) | Select-Object -Unique

$chromePolicyPaths = @(
  "HKLM:\Software\Policies\Google\Chrome",
  "HKCU:\Software\Policies\Google\Chrome"
)

$edgePolicyPaths = @(
  "HKLM:\Software\Policies\Microsoft\Edge",
  "HKCU:\Software\Policies\Microsoft\Edge"
)

foreach ($policyPath in @($chromePolicyPaths + $edgePolicyPaths)) {
  Ensure-RegistryKey -Path $policyPath

  Set-StringPolicy -Path $policyPath -Name "DnsOverHttpsMode" -Value "off"
  Set-DwordPolicy -Path $policyPath -Name "BuiltInDnsClientEnabled" -Value 0
  Set-DwordPolicy -Path $policyPath -Name "QuicAllowed" -Value 0
  Set-StringPolicy -Path $policyPath -Name "ProxyMode" -Value "system"
  Set-StringPolicy -Path $policyPath -Name "ProxyBypassList" -Value ($bypassList -join ";")
}

Write-Host ""
Write-Host "Politiques Chromium SIGEDA preproduction appliquees." -ForegroundColor Green
Write-Host "Chrome policy paths : $($chromePolicyPaths -join ', ')"
Write-Host "Edge policy paths   : $($edgePolicyPaths -join ', ')"
Write-Host "Bypass list        : $($bypassList -join ';')"
Write-Host ""
Write-Host "Fermez completement Chrome et Edge puis relancez-les."
