# PC-001: read-only Windows preflight. PREPROD. No changes, no secrets, no sleep.
# Run in the local Windows PowerShell session; returns one JSON object to stdout.
# It DOES NOT certify Wake-on-LAN, authenticate the PC or authorize suspension.
$ErrorActionPreference = 'Stop'
$gatewayHealth = 'https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-device-gateway-preprod/health'
$report = [ordered]@{
    schema_version = '1.0.0'
    company_id = 'UNBOUND'
    engine_id = 'PC-001'
    environment = 'PREPROD'
    version = '1.0.0'
    mode = 'READ_ONLY'
    recorded_at_utc = (Get-Date).ToUniversalTime().ToString('o')
    os_family = 'WINDOWS'
    local_services = @()
    powercfg_a = [ordered]@{command_ok=$false; output=''}
    network_adapters = @()
    wake_armed = @()
    wake_programmable = @()
    gateway = [ordered]@{ health_ready=$false; outbound_https_readonly=$false; agent_authenticated=$false }
    relay_verified = $false
    wake_physically_verified = $false
    suspend_authorized = $false
    reboot_persistence_verified = $false
    verdict = 'HOLD_PHYSICAL_EVIDENCE_REQUIRED'
}
foreach ($port in @(8765,8766,8767,8768)) {
    $item = [ordered]@{port=$port; listening=$false; http_health_ok=$false; response_status='UNKNOWN'}
    try {
        $listener = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop)
        $item.listening = ($listener.Count -gt 0)
    } catch { }
    try {
        $h = Invoke-RestMethod -Method Get -Uri ("http://127.0.0.1:{0}/health" -f $port) -TimeoutSec 4 -ErrorAction Stop
        $item.http_health_ok = ($h.status -eq 'OK' -and $h.prod_allowed -eq $false)
        if ($h.status -eq 'OK') { $item.response_status = 'OK' }
    } catch { $item.response_status = 'UNREACHABLE' }
    $report.local_services += [pscustomobject]$item
}
try {
    $p = (& powercfg.exe /a 2>&1 | Out-String).Trim()
    $report.powercfg_a.command_ok = ($LASTEXITCODE -eq 0)
    # A human-readable LOCAL-only diagnostic; Windows language varies.
    $report.powercfg_a.output = $p.Substring(0, [Math]::Min(4000, $p.Length))
} catch { }
foreach ($kind in @('wake_armed','wake_programmable')) {
    try {
        $lines = @(& powercfg.exe /devicequery $kind 2>$null)
        if ($LASTEXITCODE -eq 0) {
            $report[$kind] = @($lines | ForEach-Object { [string]$_ } | Where-Object { $_.Trim() -ne '' } | Select-Object -First 50)
        }
    } catch { }
}
try {
    $adapters = @(Get-NetAdapter -Physical -ErrorAction Stop)
    foreach ($a in $adapters) {
        $wakeMagic = 'UNKNOWN'
        $wakePattern = 'UNKNOWN'
        try {
            $pm = Get-NetAdapterPowerManagement -Name $a.Name -ErrorAction Stop
            if ($null -ne $pm.WakeOnMagicPacket) { $wakeMagic = [string]$pm.WakeOnMagicPacket }
            if ($null -ne $pm.WakeOnPattern) { $wakePattern = [string]$pm.WakeOnPattern }
        } catch { }
        # Interface name and driver description only; no MAC, IP, serial or stable ID.
        $report.network_adapters += [pscustomobject]@{
            interface_name = [string]$a.Name
            description = [string]$a.InterfaceDescription
            status = [string]$a.Status
            wake_on_magic_packet = $wakeMagic
            wake_on_pattern = $wakePattern
        }
    }
} catch { }
try {
    $remote = Invoke-RestMethod -Method Get -Uri $gatewayHealth -TimeoutSec 7 -ErrorAction Stop
    $report.gateway.outbound_https_readonly = $true
    $report.gateway.health_ready = ($remote.ok -eq $true -and $remote.status -eq 'READY' -and $remote.prod_allowed -eq $false)
} catch { }
# No attempt to read credentials, change Windows power configuration, or send packets.
# The always-on relay, firmware and a real suspend/wake E2E still require physical verification.
[pscustomobject]$report | ConvertTo-Json -Depth 8 -Compress
