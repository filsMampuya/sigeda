. (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "preprod-common.ps1")

param(
  [int]$RetentionDays = 7
)

$backupRoot = Get-BackupRoot

if (-not (Test-Path $backupRoot)) {
  Write-Host "[SIGEDA] Aucun dossier de sauvegarde a purger : $backupRoot"
  exit 0
}

$threshold = (Get-Date).AddDays(-$RetentionDays)

Write-Host "[SIGEDA] Purge des sauvegardes anterieures au $($threshold.ToString("yyyy-MM-dd HH:mm:ss"))"

Get-ChildItem -Path $backupRoot -Directory |
  Where-Object { $_.LastWriteTime -lt $threshold } |
  ForEach-Object {
    Write-Host "[SIGEDA] Suppression $($_.FullName)"
    Remove-Item -LiteralPath $_.FullName -Recurse -Force
  }

Write-Host "[SIGEDA] Purge terminee."
