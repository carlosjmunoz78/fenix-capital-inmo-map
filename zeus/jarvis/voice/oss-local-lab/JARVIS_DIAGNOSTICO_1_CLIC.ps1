# Solo lectura de hardware; nunca instala software, descarga modelos ni ejecuta APIs.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Ref = Join-Path $Root 'reference\JARVIS_MASTER_29S_INTOCABLE.mp3'
$Out = Join-Path $Root 'output'
$Expected = '2db9951a7b334e93a8bcc2bd80ba360b5560f89b1795e2adef77ee41674bed28'
$Blockers = New-Object System.Collections.Generic.List[string]
$ReferenceValid = $false
$RefSize = 0
try {
  if (Test-Path -LiteralPath $Ref -PathType Leaf) {
    $RefSize = (Get-Item -LiteralPath $Ref).Length
    $ReferenceValid = ((Get-FileHash -Algorithm SHA256 -LiteralPath $Ref).Hash.ToLowerInvariant() -eq $Expected)
  }
} catch {}
if (-not $ReferenceValid) { $Blockers.Add('APPROVED_REFERENCE_MISSING_OR_MODIFIED') }
$Memory = $null
try { $Memory = [Math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2) } catch {}
if ($null -eq $Memory -or $Memory -lt 12) { $Blockers.Add('MEMORY_BELOW_RECOMMENDED_12_GIB') }
$Disk = $null
try {
  $Drive = (Get-Item -LiteralPath $Root).PSDrive
  if ($Drive -and $null -ne $Drive.Free) { $Disk = [Math]::Round($Drive.Free / 1GB, 2) }
} catch {}
if ($null -eq $Disk -or $Disk -lt 8) { $Blockers.Add('DISK_BELOW_RECOMMENDED_8_GIB') }
$Gpus = @()
try { $Gpus = @(Get-CimInstance Win32_VideoController | ForEach-Object { $_.Name }) } catch {}
$FfmpegOk = $false
if (Get-Command ffmpeg -ErrorAction SilentlyContinue) {
  try { $FfmpegOk = [bool]((& ffmpeg -filters 2>&1 | Select-String 'rubberband' | Select-Object -First 1)) } catch {}
}
if (-not $FfmpegOk) { $Blockers.Add('FFMPEG_RUBBERBAND_MISSING') }
$Py311 = $false
try { $Py311 = [bool]((& py -3.11 --version 2>&1 | Select-String 'Python 3.11')) } catch {}
if (-not $Py311) { $Blockers.Add('PYTHON_3_11_REQUIRED_FOR_ONE_CLICK_RENDER') }
$Result = [ordered]@{
  schema = 'cerebro.jarvis.local.hw.probe.v1'
  company_id = 'fenix'
  engine_id = 'VOICE-001'
  environment = 'LAB'
  status = $(if ($Blockers.Count -eq 0) { 'READY_FOR_MODEL_INSTALL' } else { 'BLOCKED_OR_CAPACITY_LIMITED' })
  memory_gib = $Memory
  disk_free_gib = $Disk
  gpu_descriptions = @($Gpus)
  ffmpeg_rubberband_available = $FfmpegOk
  python_3_11_available = $Py311
  approved_reference_valid = $ReferenceValid
  reference_bytes = $RefSize
  selected_model = 'Chatterbox Multilingual V3 general / Spanish es'
  paid_voice_api_calls = 0
  model_downloaded = $false
  blockers = @($Blockers.ToArray())
}
New-Item -Path $Out -ItemType Directory -Force | Out-Null
$Json = $Result | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText((Join-Path $Out 'JARVIS_DIAGNOSTICO_HARDWARE.json'), $Json, (New-Object System.Text.UTF8Encoding($false)))
Write-Host $Json