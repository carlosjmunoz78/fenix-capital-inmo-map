param(
    [string]$RepoRoot = "",
    [ValidateSet("auto", "cpu", "cuda")]
    [string]$Device = "auto",
    [ValidateRange(1024, 65535)]
    [int]$Port = 8765
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if (-not $RepoRoot) {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
} else {
    $RepoRoot = (Resolve-Path $RepoRoot).Path
}

$RuntimeRoot = Join-Path $env:LOCALAPPDATA "CEREBRO\voice-runtime"
$PrivateRoot = Join-Path $env:LOCALAPPDATA "CEREBRO\voice-private"
$VenvPython = Join-Path $RuntimeRoot ".venv\Scripts\python.exe"
$TokenFile = Join-Path $PrivateRoot "runtime-token.dpapi"
$RegistryFile = Join-Path $PrivateRoot "registry.private.json"

if (-not (Test-Path $VenvPython)) { throw "VOICE-001 LAB runtime is not installed. Run Install-VoiceLab.ps1 first." }
if (-not (Test-Path $TokenFile)) { throw "VOICE-001 runtime token is missing. Run Install-VoiceLab.ps1 again." }

$encryptedToken = (Get-Content -Raw $TokenFile).Trim()
$secureToken = ConvertTo-SecureString $encryptedToken
$plainToken = ([System.Net.NetworkCredential]::new("", $secureToken)).Password

if ($Device -eq "auto") {
    $Device = (& $VenvPython -c "import torch; print('cuda' if torch.cuda.is_available() else 'cpu')").Trim()
}
if ($Device -eq "cuda") {
    $cudaReady = (& $VenvPython -c "import torch; print('YES' if torch.cuda.is_available() else 'NO')").Trim()
    if ($cudaReady -ne "YES") { throw "CUDA requested but torch reports no usable CUDA device." }
}

$env:CEREBRO_ENVIRONMENT = "LAB"
$env:CEREBRO_VOICE_REF_ROOT = $PrivateRoot
$env:CEREBRO_VOICE_PRIVATE_REGISTRY = $RegistryFile
$env:CEREBRO_VOICE_RUNTIME_TOKEN = $plainToken
$env:CEREBRO_VOICE_DEVICE = $Device

Push-Location $RepoRoot
try {
    Write-Host "Starting VOICE-001 on 127.0.0.1:$Port using device=$Device"
    Write-Host "LAB only. Browser speechSynthesis remains the rollback/fallback path."
    & $VenvPython -m uvicorn cerebro.voice.runtime.app:app --host 127.0.0.1 --port $Port
    if ($LASTEXITCODE -ne 0) { throw "VOICE-001 runtime exited with code $LASTEXITCODE" }
} finally {
    Pop-Location
    Remove-Item Env:CEREBRO_VOICE_RUNTIME_TOKEN -ErrorAction SilentlyContinue
    $plainToken = $null
}
