param(
  [string]$TaskPrefix = "SIGEDA Preprod"
)

$ErrorActionPreference = "Stop"

$taskNames = @(
  "$TaskPrefix Backup",
  "$TaskPrefix Backup Prune",
  "$TaskPrefix Healthcheck"
)

foreach ($taskName in $taskNames) {
  $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  if ($task) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "[SIGEDA] Tache supprimee : $taskName"
  } else {
    Write-Host "[SIGEDA] Tache absente : $taskName"
  }
}
