[CmdletBinding()]
param(
  [string]$TaskName = 'CEREBRO-LRN-001-PREPROD',
  [string]$CompanyId = 'fenix',
  [string]$DataRoot = (Join-Path $env:ProgramData 'CEREBRO'),
  [ValidateRange(5000,3600000)][int]$ExpectedPollIntervalMs = 60000
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$engineId = 'LRN-001'
$stateRoot = Join-Path $DataRoot 'state'
$engineRoot = Join-Path $stateRoot (Join-Path $CompanyId $engineId)
$heartbeatPath = Join-Path $engineRoot 'heartbeat.json'
$killSwitchPath = Join-Path $engineRoot 'KILL_SWITCH'
$ledgerPath = Join-Path $engineRoot 'learning.v8'
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
$taskInfo = if ($null -ne $task) { Get-ScheduledTaskInfo -TaskName $TaskName } else { $null }
$heartbeat = if (Test-Path -LiteralPath $heartbeatPath) { Get-Content -LiteralPath $heartbeatPath -Raw | ConvertFrom-Json } else { $null }
$now = (Get-Date).ToUniversalTime()
$ageSeconds = $null
if ($null -ne $heartbeat -and $heartbeat.cycle_finished_at) {
  $last = [DateTime]::Parse($heartbeat.cycle_finished_at).ToUniversalTime()
  $ageSeconds = [math]::Round(($now - $last).TotalSeconds,2)
}
$maxAgeSeconds = [math]::Max(30,[math]::Ceiling(($ExpectedPollIntervalMs / 1000.0) * 2.5))
$taskRunning = $null -ne $task -and $task.State -eq 'Running'
$heartbeatFresh = $null -ne $ageSeconds -and $ageSeconds -le $maxAgeSeconds
$heartbeatSafe = $null -ne $heartbeat -and $heartbeat.environment -eq 'PREPROD' -and $heartbeat.engine_id -eq 'LRN-001' -and $heartbeat.prod_authorized -eq $false -and $heartbeat.prod_write_authorized -eq $false
$status = if ($taskRunning -and $heartbeatFresh -and $heartbeatSafe) { 'GREEN' } elseif ($null -eq $task -or $null -eq $heartbeat) { 'NOT_PROVEN' } else { 'DEGRADED' }

[ordered]@{
  status = $status
  task_name = $TaskName
  task_state = if ($null -ne $task) { [string]$task.State } else { 'MISSING' }
  last_task_result = if ($null -ne $taskInfo) { $taskInfo.LastTaskResult } else { $null }
  company_id = $CompanyId
  engine_id = $engineId
  environment = if ($null -ne $heartbeat) { $heartbeat.environment } else { $null }
  heartbeat_status = if ($null -ne $heartbeat) { $heartbeat.status } else { 'MISSING' }
  heartbeat_age_seconds = $ageSeconds
  heartbeat_fresh = $heartbeatFresh
  kill_switch_enabled = (Test-Path -LiteralPath $killSwitchPath)
  ledger_exists = (Test-Path -LiteralPath $ledgerPath)
  prod_authorized = $false
  physical_host_confirmed = ($status -eq 'GREEN')
} | ConvertTo-Json -Depth 4
