param(
    [string]$RepoRoot = "",
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-RepoRoot {
    param([string]$Requested)
    if ($Requested) {
        return (Resolve-Path $Requested).Path
    }
    return (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
}

function Resolve-Python311 {
    try {
        $candidate = (& py -3.11 -c "import sys; print(sys.executable)" 2>$null | Select-Object -First 1).Trim()
        if ($candidate -and (Test-Path $candidate)) { return $candidate }
    } catch {}

    try {
        $candidate = (& python -c "import sys; print(sys.executable)" 2>$null | Select-Object -First 1).Trim()
        if ($candidate -and (Test-Path $candidate)) {
            $version = (& $candidate -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')").Trim()
            if ([version]$version -ge [version]"3.10") { return $candidate }
        }
    } catch {}

    throw "Python 3.11 preferred (minimum 3.10) was not found. Install Python 3.11 x64 and rerun."
}

function New-RuntimeToken {
    $bytes = New-Object byte[] 48
    [Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
}

function Protect-PrivateDirectory {
    param([string]$Path)
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $acl = New-Object System.Security.AccessControl.DirectorySecurity
    $acl.SetAccessRuleProtection($true, $false)
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
        $identity,
        [System.Security.AccessControl.FileSystemRights]::FullControl,
        [System.Security.AccessControl.InheritanceFlags]"ContainerInherit, ObjectInherit",
        [System.Security.AccessControl.PropagationFlags]::None,
        [System.Security.AccessControl.AccessControlType]::Allow
    )
    $acl.AddAccessRule($rule)
    Set-Acl -Path $Path -AclObject $acl
}

$RepoRoot = Resolve-RepoRoot $RepoRoot
$RuntimeRoot = Join-Path $env:LOCALAPPDATA "CEREBRO\voice-runtime"
$PrivateRoot = Join-Path $env:LOCALAPPDATA "CEREBRO\voice-private"
$EvidenceRoot = Join-Path $env:LOCALAPPDATA "CEREBRO\voice-evidence"
$VenvRoot = Join-Path $RuntimeRoot ".venv"
$VenvPython = Join-Path $VenvRoot "Scripts\python.exe"
$TokenFile = Join-Path $PrivateRoot "runtime-token.dpapi"
$RegistryFile = Join-Path $PrivateRoot "registry.private.json"
$Requirements = Join-Path $RepoRoot "cerebro\voice\runtime\requirements.txt"
$Probe = Join-Path $RepoRoot "cerebro\voice\runtime\physical_lab_probe.py"

if (-not (Test-Path $Requirements)) { throw "VOICE-001 requirements not found at $Requirements" }
if (-not (Test-Path $Probe)) { throw "VOICE-001 physical probe not found at $Probe" }

New-Item -ItemType Directory -Force -Path $RuntimeRoot, $PrivateRoot, $EvidenceRoot | Out-Null
Protect-PrivateDirectory $PrivateRoot

$BootstrapPython = Resolve-Python311
if (-not (Test-Path $VenvPython)) {
    & $BootstrapPython -m venv $VenvRoot
    if ($LASTEXITCODE -ne 0) { throw "Failed to create VOICE-001 virtual environment" }
}

if (-not $SkipInstall) {
    & $VenvPython -m pip install --disable-pip-version-check --upgrade pip
    if ($LASTEXITCODE -ne 0) { throw "pip bootstrap failed" }
    & $VenvPython -m pip install --disable-pip-version-check -r $Requirements
    if ($LASTEXITCODE -ne 0) { throw "VOICE-001 dependency installation failed" }
}

if (-not (Test-Path $TokenFile)) {
    $token = New-RuntimeToken
    $secure = ConvertTo-SecureString $token -AsPlainText -Force
    $encrypted = ConvertFrom-SecureString $secure
    Set-Content -Path $TokenFile -Value $encrypted -NoNewline -Encoding utf8
}

$encryptedToken = (Get-Content -Raw $TokenFile).Trim()
$secureToken = ConvertTo-SecureString $encryptedToken
$plainToken = ([System.Net.NetworkCredential]::new("", $secureToken)).Password

$env:CEREBRO_ENVIRONMENT = "LAB"
$env:CEREBRO_VOICE_REF_ROOT = $PrivateRoot
$env:CEREBRO_VOICE_PRIVATE_REGISTRY = $RegistryFile
$env:CEREBRO_VOICE_RUNTIME_TOKEN = $plainToken
$env:CEREBRO_VOICE_DEVICE = "cpu"

Push-Location $RepoRoot
try {
    & $VenvPython -c "from chatterbox.mtl_tts import ChatterboxMultilingualTTS; print('GREEN chatterbox_multilingual import')"
    if ($LASTEXITCODE -ne 0) { throw "Chatterbox multilingual import failed" }

    $ProbeOut = Join-Path $EvidenceRoot "host-probe.json"
    & $VenvPython $Probe --require-token --require-model-package --output $ProbeOut
    if ($LASTEXITCODE -ne 0) { throw "VOICE-001 physical LAB host probe is not GREEN" }
} finally {
    Pop-Location
    Remove-Item Env:CEREBRO_VOICE_RUNTIME_TOKEN -ErrorAction SilentlyContinue
    $plainToken = $null
}

Write-Host "GREEN VOICE-001 physical LAB host automation installed."
Write-Host "Private references: $PrivateRoot"
Write-Host "Evidence: $EvidenceRoot"
Write-Host "Runtime remains LAB-only and loopback-only. No PROD binding was changed."
