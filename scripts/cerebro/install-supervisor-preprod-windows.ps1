param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [ValidateSet('PREPROD')][string]$Environment = 'PREPROD'
)

$ErrorActionPreference = 'Stop'
$TaskName = 'CEREBRO-Supervisor-PREPROD'
$RuntimeRel = 'cerebro\runtime\cerebro-supervisor-daemon-v0.mjs'
$Source = Join-Path $RepoRoot $RuntimeRel
if (-not (Test-Path $Source)) { throw "Supervisor daemon not found at $Source" }

$node = (Get-Command node -ErrorAction Stop).Source
$InstallRoot = Join-Path $env:LOCALAPPDATA 'CEREBRO\SupervisorRuntime\app'
$StateRoot = Join-Path $env:LOCALAPPDATA 'CEREBRO\SupervisorRuntime\state'
$BackupRoot = Join-Path $env:LOCALAPPDATA ('CEREBRO\SupervisorRuntime\backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))

New-Item -ItemType Directory -Force -Path $InstallRoot,$StateRoot | Out-Null
if (Test-Path (Join-Path $InstallRoot 'cerebro')) {
  New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
  Copy-Item -Recurse -Force (Join-Path $InstallRoot 'cerebro') $BackupRoot
}

Copy-Item -Recurse -Force (Join-Path $RepoRoot 'cerebro') $InstallRoot
$Daemon = Join-Path $InstallRoot $RuntimeRel
if (-not (Test-Path $Daemon)) { throw 'Installed daemon missing after copy' }

$env:CEREBRO_SUPERVISOR_STATE_DIR = $StateRoot
$env:CEREBRO_SUPERVISOR_ENV = 'PREPROD'
& $node $Daemon --enqueue-health-probe --cycles 2
if ($LASTEXITCODE -ne 0) { throw "PREPROD smoke failed with exit code $LASTEXITCODE" }

$Heartbeat = Join-Path $StateRoot 'heartbeat.json'
if (-not (Test-Path $Heartbeat)) { throw 'Heartbeat missing after smoke' }
$hb = Get-Content $Heartbeat -Raw | ConvertFrom-Json
if ($hb.environment -ne 'PREPROD' -or $hb.prod_authorized -ne $false -or $hb.trading_access -ne $false) {
  throw 'Heartbeat contract mismatch; refusing scheduled task registration'
}

$arg = '"' + $Daemon + '" --enqueue-health-probe'
$action = New-ScheduledTaskAction -Execute $node -Argument $arg -WorkingDirectory $InstallRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -RestartCount 10 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$task = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'CEREBRO continuous supervisor PREPROD. No PROD authority. No Trading access.'
Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 3

$info = Get-ScheduledTaskInfo -TaskName $TaskName
$result = [ordered]@{
  status = 'INSTALLED_PREPROD'
  task_name = $TaskName
  daemon = $Daemon
  state_root = $StateRoot
  last_task_result = $info.LastTaskResult
  prod_authorized = $false
  trading_access = $false
  rollback = "Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
}
$result | ConvertTo-Json -Depth 4
