<?php
/**
 * JOB-001 Hostinger canary probe.
 *
 * Zero-secret, read-only canary used to prove the external scheduler/runtime path.
 * It ONLY performs an HTTP GET against the existing staging Core Guard status URL
 * and emits one JSON line to stdout. It does not call Supabase, mutate WordPress,
 * send email, publish content, or touch customer data.
 */

declare(strict_types=1);

const TARGET_URL = 'https://staging.fenixcapital.es/wp-json/fenix-guard/v1/cerebro/status';
const CONNECT_TIMEOUT_SECONDS = 5;
const TOTAL_TIMEOUT_SECONDS = 15;

function fail(string $code, array $extra = []): never
{
    $payload = array_merge([
        'ok' => false,
        'engine_id' => 'JOB-001',
        'job_id' => 'seo001-wp-bridge-probe-hostinger-canary',
        'company_id' => 'FENIX_CAPITAL',
        'environment' => 'PREPROD',
        'mode' => 'READ_ONLY_CANARY',
        'error' => $code,
        'observed_at' => gmdate('c'),
    ], $extra);
    $line = json_encode($payload, JSON_UNESCAPED_SLASHES) . PHP_EOL;
    file_put_contents(__DIR__ . '/job001_wp_bridge_canary.log', $line, FILE_APPEND | LOCK_EX);
    fwrite(STDOUT, $line);
    exit(1);
}

$ch = curl_init(TARGET_URL);
if ($ch === false) {
    fail('CURL_INIT_FAILED');
}

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => CONNECT_TIMEOUT_SECONDS,
    CURLOPT_TIMEOUT => TOTAL_TIMEOUT_SECONDS,
    CURLOPT_HTTPHEADER => ['Accept: application/json'],
    CURLOPT_USERAGENT => 'CEREBRO-JOB-001-Hostinger-Canary/0.1',
]);

$body = curl_exec($ch);
if ($body === false) {
    $error = curl_error($ch);
    curl_close($ch);
    fail('HTTP_REQUEST_FAILED', ['detail' => $error]);
}

$status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);

if ($status < 200 || $status >= 300) {
    fail('HTTP_NON_2XX', ['http_status' => $status]);
}

$decoded = json_decode($body, true);
if (!is_array($decoded)) {
    fail('INVALID_JSON', ['http_status' => $status]);
}

$payload = [
    'ok' => true,
    'engine_id' => 'JOB-001',
    'job_id' => 'seo001-wp-bridge-probe-hostinger-canary',
    'legacy_pg_cron_job_id' => 13,
    'company_id' => 'FENIX_CAPITAL',
    'environment' => 'PREPROD',
    'mode' => 'READ_ONLY_CANARY',
    'target' => TARGET_URL,
    'http_status' => $status,
    'response_sha256' => hash('sha256', $body),
    'observed_at' => gmdate('c'),
];

$line = json_encode($payload, JSON_UNESCAPED_SLASHES) . PHP_EOL;
file_put_contents(__DIR__ . '/job001_wp_bridge_canary.log', $line, FILE_APPEND | LOCK_EX);
fwrite(STDOUT, $line);
