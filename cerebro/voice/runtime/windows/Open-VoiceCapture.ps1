param(
  [string]$RepoRoot = "",
  [int]$Port = 8766
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (-not $RepoRoot) { $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path } else { $RepoRoot = (Resolve-Path $RepoRoot).Path }
$CaptureDir = Join-Path $RepoRoot 'cerebro\voice\capture'
$CaptureFile = Join-Path $CaptureDir 'voice-capture.html'
if (-not (Test-Path $CaptureFile)) { throw "VOICE-001 capture UI not found: $CaptureFile" }
$python = $null
try { $python = (& py -3.11 -c "import sys; print(sys.executable)" 2>$null | Select-Object -First 1).Trim() } catch {}
if (-not $python -or -not (Test-Path $python)) {
  try { $python = (& python -c "import sys; print(sys.executable)" 2>$null | Select-Object -First 1).Trim() } catch {}
}
if (-not $python -or -not (Test-Path $python)) { throw 'Python was not found.' }
$busy = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($busy) { throw "Port $Port is already in use. Choose another -Port." }
$argList = @('-m','http.server',[string]$Port,'--bind','127.0.0.1','--directory',$CaptureDir)
$proc = Start-Process -FilePath $python -ArgumentList $argList -PassThru -WindowStyle Hidden
Start-Sleep -Milliseconds 800
if ($proc.HasExited) { throw 'Local capture server exited before startup.' }
$url = "http://127.0.0.1:$Port/voice-capture.html"
Start-Process $url
Write-Host "GREEN VOICE-001 local capture UI opened: $url"
Write-Host "Server PID: $($proc.Id)"
Write-Host "Audio remains local. Close this PowerShell or stop PID $($proc.Id) after capture."
