[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$NodePath,
  [Parameter(Mandatory=$true)][string]$HostScript,
  [Parameter(Mandatory=$true)][string]$ConfigPath,
  [Parameter(Mandatory=$true)][string]$LogRoot
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

foreach ($path in @($NodePath,$HostScript,$ConfigPath)) {
  if (-not (Test-Path -LiteralPath $path)) { throw "Required path missing: $path" }
}
New-Item -ItemType Directory -Path $LogRoot -Force | Out-Null
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd')
$logFile = Join-Path $LogRoot ("host-{0}.log" -f $stamp)

& $NodePath $HostScript daemon --config $ConfigPath *>> $logFile
$code = $LASTEXITCODE
if ($null -eq $code) { $code = 1 }
exit $code
