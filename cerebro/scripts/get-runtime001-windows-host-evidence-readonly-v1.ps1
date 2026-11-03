# CEREBRO RUNTIME-001 / JOB-001 local read-only physical host probe.
# Does not install, start, stop, register, remove, upload or alter any resource.
[CmdletBinding()]
param(
  [string]$TaskName = 'CEREBRO-Supervisor-PREPROD',
  [string]$StateRoot = (Join-Path $env:LOCALAPPDATA 'CEREBRO\SupervisorRuntime'),
  [ValidateRange(1000,600000)][int]$MaxHeartbeatAgeMs = 120000
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$now = [DateTimeOffset]::UtcNow
$out = [ordered]@{
  schema_version='1.0.0'
  state_type='CEREBRO_RUNTIME001_WINDOWS_HOST_READONLY_PROBE'
  environment='PREPROD'
  task_name=$TaskName
  task_found=$false
  task_running=$false
  heartbeat_file_exists=$false
  heartbeat_fresh=$false
  heartbeat_age_ms=$null
  heartbeat_policy_safe=$false
  job001_journal_exists=$false
  job001_journal_bytes=$null
  job001_journal_sha256=$null
  status='NOT_VERIFIED'
  reasons=@()
  expected_heartbeat_max_age_ms=$MaxHeartbeatAgeMs
  prod_write_authorized=$false
  trading_access=$false
  installation_performed=$false
  scheduled_task_mutated=$false
  filesystem_mutated=$false
  secrets_inspected=$false
  remote_request_performed=$false
}
try {
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($null -ne $task) {
    $out.task_found=$true
    $out.task_running=($task.State -eq 'Running')
  } else { $out.reasons+= 'WINDOWS_TASK_NOT_FOUND' }
} catch { $out.reasons+= 'WINDOWS_TASK_READ_UNAVAILABLE' }
try {
  $heartbeatPath = Join-Path $StateRoot 'heartbeat.json'
  if (Test-Path -LiteralPath $heartbeatPath -PathType Leaf) {
    $out.heartbeat_file_exists=$true
    $heartbeat=Get-Content -LiteralPath $heartbeatPath -Raw | ConvertFrom-Json
    $dt=[DateTimeOffset]::Parse([string]$heartbeat.updated_at)
    $age=[math]::Max(0,($now-$dt).TotalMilliseconds)
    $out.heartbeat_age_ms=[math]::Floor($age)
    $out.heartbeat_fresh=($age -le $MaxHeartbeatAgeMs -and $dt -le $now.AddSeconds(10))
    $out.heartbeat_policy_safe=($heartbeat.environment -eq 'PREPROD' -and
      $heartbeat.prod_authorized -eq $false -and
      $heartbeat.prod_write_authorized -eq $false -and
      $heartbeat.trading_access -eq $false)
    if (-not $out.heartbeat_fresh) {$out.reasons+='HEARTBEAT_STALE'}
    if (-not $out.heartbeat_policy_safe) {$out.reasons+='HEARTBEAT_POLICY_UNSAFE'}
  } else { $out.reasons+='HEARTBEAT_NOT_FOUND' }
} catch { $out.reasons+='HEARTBEAT_UNREADABLE' }
try {
  $journal=Join-Path $StateRoot 'jobs.v8journal'
  if (Test-Path -LiteralPath $journal -PathType Leaf) {
    $out.job001_journal_exists=$true
    $item=Get-Item -LiteralPath $journal
    $out.job001_journal_bytes=[long]$item.Length
    $out.job001_journal_sha256=(Get-FileHash -LiteralPath $journal -Algorithm SHA256).Hash.ToLowerInvariant()
  } else {$out.reasons+='JOB001_JOURNAL_NOT_FOUND'}
} catch { $out.reasons+='JOB001_JOURNAL_UNREADABLE' }
if ($out.task_running -and $out.heartbeat_fresh -and $out.heartbeat_policy_safe -and $out.job001_journal_exists) {
  $out.status='LOCAL_HOST_OBSERVED_PREPROD'
} else {
  $out.status='BLOCKED_LOCAL_HOST_ACCEPTANCE'
}
# Only sanitized telemetry metadata and hash are emitted; never paths, credentials or raw file data.
$out | ConvertTo-Json -Depth 5
