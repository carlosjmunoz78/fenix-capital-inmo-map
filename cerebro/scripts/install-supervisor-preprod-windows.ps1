param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [ValidateSet('PREPROD')][string]$Environment = 'PREPROD'
)

$ErrorActionPreference = 'Stop'
$TaskName = 'CEREBRO-Supervisor-PREPROD'
$EntrypointRel = 'cerebro\runtime\cerebro-supervisor-entrypoint-v1.mjs'
$LegacyRel = 'cerebro\runtime\cerebro-supervisor-daemon-v0.mjs'
$EntrypointSource = Join-Path $RepoRoot $EntrypointRel
$LegacySource = Join-Path $RepoRoot $LegacyRel
if (-not (Test-Path $EntrypointSource)) { throw "Supervisor entrypoint V1 not found at $EntrypointSource" }
if (-not (Test-Path $LegacySource)) { throw "Legacy supervisor daemon V0 not found at $LegacySource" }

$node = (Get-Command node -ErrorAction Stop).Source
$InstallRoot = Join-Path $env:LOCALAPPDATA 'CEREBRO\SupervisorRuntime\app'
$StateRoot = Join-Path $env:LOCALAPPDATA 'CEREBRO\SupervisorRuntime'
$SmokeStateRoot = Join-Path $env:TEMP ('CEREBRO-SupervisorSmoke-' + [guid]::NewGuid().ToString('N'))
$BackupRoot = Join-Path $env:LOCALAPPDATA ('CEREBRO\SupervisorRuntime\backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$PreviousTaskXml = Join-Path $BackupRoot 'scheduled-task.xml'
$InstallStarted = Get-Date
$HadPreviousTask = $false
$HadPreviousApp = Test-Path (Join-Path $InstallRoot 'cerebro')

New-Item -ItemType Directory -Force -Path $InstallRoot,$StateRoot,$BackupRoot,$SmokeStateRoot | Out-Null

try {
  $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($null -ne $existingTask) {
    $HadPreviousTask = $true
    Export-ScheduledTask -TaskName $TaskName | Set-Content -Encoding Unicode $PreviousTaskXml
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  }

  if ($HadPreviousApp) { Copy-Item -Recurse -Force (Join-Path $InstallRoot 'cerebro') $BackupRoot }

  Copy-Item -Recurse -Force (Join-Path $RepoRoot 'cerebro') $InstallRoot
  $Entrypoint = Join-Path $InstallRoot $EntrypointRel
  $Legacy = Join-Path $InstallRoot $LegacyRel
  if (-not (Test-Path $Entrypoint)) { throw 'Installed entrypoint V1 missing after copy' }
  if (-not (Test-Path $Legacy)) { throw 'Installed legacy daemon V0 missing after copy' }

  $oldStateDir = $env:CEREBRO_SUPERVISOR_STATE_DIR
  $oldSupervisorEnv = $env:CEREBRO_SUPERVISOR_ENV
  $oldWorkPump = $env:CEREBRO_ENABLE_DEEPSEEK_WORK_PUMP
  $oldRepoSandbox = $env:CEREBRO_ENABLE_REPO_SANDBOX
  $oldRemoteTelemetry = $env:CEREBRO_REMOTE_TELEMETRY
  $env:CEREBRO_SUPERVISOR_STATE_DIR = $SmokeStateRoot
  $env:CEREBRO_SUPERVISOR_ENV = 'PREPROD'
  $env:CEREBRO_ENABLE_DEEPSEEK_WORK_PUMP = 'NO'
  $env:CEREBRO_ENABLE_REPO_SANDBOX = 'NO'
  $env:CEREBRO_REMOTE_TELEMETRY = 'NO'
  try {
    & $node $Entrypoint --enqueue-health-probe --cycles 2
    if ($LASTEXITCODE -ne 0) { throw "PREPROD V1 smoke failed with exit code $LASTEXITCODE" }
  }
  finally {
    $env:CEREBRO_SUPERVISOR_STATE_DIR = $oldStateDir
    $env:CEREBRO_SUPERVISOR_ENV = $oldSupervisorEnv
    $env:CEREBRO_ENABLE_DEEPSEEK_WORK_PUMP = $oldWorkPump
    $env:CEREBRO_ENABLE_REPO_SANDBOX = $oldRepoSandbox
    $env:CEREBRO_REMOTE_TELEMETRY = $oldRemoteTelemetry
  }

  $SmokeHeartbeat = Join-Path $SmokeStateRoot 'heartbeat.json'
  if (-not (Test-Path $SmokeHeartbeat)) { throw 'Smoke heartbeat missing after V1 smoke' }
  $smoke = Get-Content $SmokeHeartbeat -Raw | ConvertFrom-Json
  if ($smoke.environment -ne 'PREPROD' -or $smoke.prod_authorized -ne $false -or $smoke.prod_write_authorized -ne $false -or $smoke.trading_access -ne $false) {
    throw 'Smoke heartbeat policy mismatch; refusing scheduled task registration'
  }
  if ($smoke.dynamic_concurrency.target_global_concurrency -ne 360 -or
      $smoke.dynamic_concurrency.max_global_concurrency -ne 360 -or
      $smoke.dynamic_concurrency.max_company_concurrency -ne 360 -or
      $smoke.dynamic_concurrency.max_provider_concurrency.deepseek -ne 8 -or
      $smoke.dynamic_concurrency.max_repo_write_concurrency -ne 1) {
    throw 'Smoke heartbeat 360/360/360/8/1 mismatch; refusing scheduled task registration'
  }

  $arg = '"' + $Entrypoint + '" --enqueue-health-probe'
  $action = New-ScheduledTaskAction -Execute $node -Argument $arg -WorkingDirectory $InstallRoot
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  $settings = New-ScheduledTaskSettingsSet -RestartCount 10 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
  $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
  $task = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'CEREBRO continuous supervisor PREPROD 360/360 via entrypoint V1. V0 preserved for rollback. DeepSeek max 8. Repo write max 1. No PROD authority. No Trading access.'
  Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null
  Start-ScheduledTask -TaskName $TaskName

  $Heartbeat = Join-Path $StateRoot 'heartbeat.json'
  $deadline = (Get-Date).AddSeconds(25)
  $hb = $null
  do {
    Start-Sleep -Milliseconds 500
    if (Test-Path $Heartbeat) {
      try {
        $candidate = Get-Content $Heartbeat -Raw | ConvertFrom-Json
        if ([datetime]$candidate.updated_at -ge $InstallStarted.AddSeconds(-2)) { $hb = $candidate }
      } catch { }
    }
  } while ($null -eq $hb -and (Get-Date) -lt $deadline)

  if ($null -eq $hb) { throw 'Fresh live heartbeat missing after scheduled task start' }
  if ($hb.environment -ne 'PREPROD' -or $hb.prod_authorized -ne $false -or $hb.prod_write_authorized -ne $false -or $hb.trading_access -ne $false) {
    throw 'Live heartbeat policy mismatch after scheduled task start'
  }
  if ($hb.dynamic_concurrency.target_global_concurrency -ne 360 -or
      $hb.dynamic_concurrency.max_global_concurrency -ne 360 -or
      $hb.dynamic_concurrency.max_company_concurrency -ne 360 -or
      $hb.dynamic_concurrency.max_provider_concurrency.deepseek -ne 8 -or
      $hb.dynamic_concurrency.max_repo_write_concurrency -ne 1) {
    throw 'Live heartbeat 360/360/360/8/1 mismatch after scheduled task start'
  }

  $info = Get-ScheduledTaskInfo -TaskName $TaskName
  $result = [ordered]@{
    status = 'INSTALLED_PREPROD_360'
    task_name = $TaskName
    entrypoint = $Entrypoint
    legacy_daemon_v0 = $Legacy
    state_root = $StateRoot
    heartbeat = $Heartbeat
    target_global_concurrency = $hb.dynamic_concurrency.target_global_concurrency
    max_global_concurrency = $hb.dynamic_concurrency.max_global_concurrency
    max_company_concurrency = $hb.dynamic_concurrency.max_company_concurrency
    max_deepseek_concurrency = $hb.dynamic_concurrency.max_provider_concurrency.deepseek
    max_repo_write_concurrency = $hb.dynamic_concurrency.max_repo_write_concurrency
    useful_queued = $hb.useful_work.useful_queued
    useful_running = $hb.useful_work.useful_running
    target_active_backlog = $hb.useful_work.target_active_backlog
    remote_telemetry_configured = [bool]($env:CEREBRO_DEVICE_ID -and $env:CEREBRO_PREPROD_SUPABASE_URL -and $env:CEREBRO_PREPROD_SUPABASE_SERVICE_ROLE_KEY)
    last_task_result = $info.LastTaskResult
    prod_authorized = $false
    prod_write_authorized = $false
    trading_access = $false
    backup_root = $BackupRoot
    rollback = "Restore app from '$BackupRoot' and scheduled-task.xml, or run legacy '$Legacy' directly in PREPROD."
  }
  $result | ConvertTo-Json -Depth 6
}
catch {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

  if ($HadPreviousApp -and (Test-Path (Join-Path $BackupRoot 'cerebro'))) {
    Remove-Item -Recurse -Force (Join-Path $InstallRoot 'cerebro') -ErrorAction SilentlyContinue
    Copy-Item -Recurse -Force (Join-Path $BackupRoot 'cerebro') $InstallRoot
  }
  if ($HadPreviousTask -and (Test-Path $PreviousTaskXml)) {
    $xml = Get-Content $PreviousTaskXml -Raw
    Register-ScheduledTask -TaskName $TaskName -Xml $xml -Force | Out-Null
    Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  }
  throw
}
finally {
  Remove-Item -Recurse -Force $SmokeStateRoot -ErrorAction SilentlyContinue
}