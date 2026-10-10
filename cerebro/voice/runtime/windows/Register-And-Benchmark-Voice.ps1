param(
    [Parameter(Mandatory=$true)]
    [ValidatePattern('^ES[FM][0-9]{2}$')]
    [string]$VoiceId,

    [Parameter(Mandatory=$true)]
    [string]$Audio,

    [string]$CompanyId = "fenix",

    [ValidateSet("OWNER_RECORDED", "EMPLOYEE_CONSENTED", "LICENSED_VOICE_ASSET", "SYNTHETIC_OWNED")]
    [string]$Provenance = "OWNER_RECORDED",

    [string]$ConsentRef = "",
    [string]$ConsentMetadata = "",
    [string]$License = "",
    [string]$VerifiedBy = "",

    [ValidateSet("auto", "cpu", "cuda")]
    [string]$Device = "auto",

    [ValidateRange(1, 5)]
    [int]$Repeats = 1,

    [string]$RepoRoot = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if (-not $RepoRoot) {
    $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
} else {
    $RepoRoot = (Resolve-Path $RepoRoot).Path
}

$Audio = (Resolve-Path $Audio).Path
if (-not $VerifiedBy) {
    $VerifiedBy = [Security.Principal.WindowsIdentity]::GetCurrent().Name
}

if ($ConsentMetadata) {
    $ConsentMetadata = (Resolve-Path $ConsentMetadata).Path
    $meta = Get-Content -Raw $ConsentMetadata | ConvertFrom-Json
    if ($meta.engine_id -ne 'VOICE-001') { throw 'Consent metadata engine_id mismatch.' }
    if ($meta.voice_id -ne $VoiceId) { throw 'Consent metadata voice_id mismatch.' }
    if ($meta.company_id -ne $CompanyId) { throw 'Consent metadata company_id mismatch.' }
    if ($meta.explicit_consent -ne $true) { throw 'Consent metadata does not confirm explicit consent.' }
    if ($meta.capture_origin -ne 'LOCAL_BROWSER_ONLY') { throw 'Unexpected capture origin.' }
    if (-not $meta.consent_ref) { throw 'Consent metadata has no consent_ref.' }
    if ($ConsentRef -and $ConsentRef -ne $meta.consent_ref) { throw 'ConsentRef conflicts with consent metadata.' }
    $ConsentRef = [string]$meta.consent_ref
}

if ($Provenance -in @("OWNER_RECORDED", "EMPLOYEE_CONSENTED") -and -not $ConsentRef) {
    throw "ConsentRef is mandatory for a recorded real speaker."
}
if (-not $ConsentRef -and -not $License) {
    throw "Provide ConsentRef or License before registering a voice."
}

$RuntimeRoot = Join-Path $env:LOCALAPPDATA "CEREBRO\voice-runtime"
$PrivateRoot = Join-Path $env:LOCALAPPDATA "CEREBRO\voice-private"
$EvidenceRoot = Join-Path $env:LOCALAPPDATA "CEREBRO\voice-evidence"
$VenvPython = Join-Path $RuntimeRoot ".venv\Scripts\python.exe"
$RegistryFile = Join-Path $PrivateRoot "registry.private.json"
$RegisterScript = Join-Path $RepoRoot "cerebro\voice\runtime\register_voice_reference.py"
$BenchmarkScript = Join-Path $RepoRoot "cerebro\voice\runtime\physical_lab_benchmark.py"
$ValidateScript = Join-Path $RepoRoot "cerebro\voice\runtime\validate_reference_audio.py"

if (-not (Test-Path $VenvPython)) { throw "VOICE-001 LAB runtime is not installed. Run Install-VoiceLab.ps1 first." }
if (-not (Test-Path $RegisterScript)) { throw "Reference registration script not found." }
if (-not (Test-Path $BenchmarkScript)) { throw "Physical benchmark script not found." }
if (-not (Test-Path $ValidateScript)) { throw "Reference validation script not found." }

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
$env:CEREBRO_VOICE_DEVICE = $Device

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$VoiceEvidence = Join-Path $EvidenceRoot "$VoiceId\$Timestamp"
New-Item -ItemType Directory -Force -Path $VoiceEvidence | Out-Null
$ValidationEvidence = Join-Path $VoiceEvidence 'reference-validation.json'

Push-Location $RepoRoot
try {
    & $VenvPython $ValidateScript $Audio --output $ValidationEvidence
    if ($LASTEXITCODE -ne 0) { throw "Reference audio failed deterministic technical validation. See $ValidationEvidence" }

    $registerArgs = @(
        $RegisterScript,
        "--voice-id", $VoiceId,
        "--company-id", $CompanyId,
        "--audio", $Audio,
        "--provenance", $Provenance,
        "--verified-by", $VerifiedBy,
        "--ref-root", $PrivateRoot,
        "--private-registry", $RegistryFile
    )
    if ($ConsentRef) { $registerArgs += @("--consent-ref", $ConsentRef) }
    if ($License) { $registerArgs += @("--license", $License) }

    & $VenvPython @registerArgs
    if ($LASTEXITCODE -ne 0) { throw "Voice registration failed." }

    Write-Host "Reference validated and registered privately. Starting fixed es-ES physical benchmark."
    Write-Host "The first model load may download open-source model weights; no paid TTS API is used."

    & $VenvPython $BenchmarkScript --voice-id $VoiceId --company-id $CompanyId --output-dir $VoiceEvidence --repeats $Repeats
    if ($LASTEXITCODE -ne 0) { throw "Physical voice benchmark failed." }
} finally {
    Pop-Location
}

Write-Host "MEASURED_NOT_ACCEPTED: benchmark completed for $VoiceId."
Write-Host "Evidence: $VoiceEvidence"
Write-Host "Listen to the generated corpus and complete the QA fields before any PREPROD_READY decision."
Write-Host "No PROD, App, CRM, Supabase, WordPress or Trading binding was changed."
