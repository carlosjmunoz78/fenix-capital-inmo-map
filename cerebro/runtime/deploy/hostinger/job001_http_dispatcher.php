<?php
/**
 * JOB-001 generic Hostinger HTTP dispatcher.
 *
 * PREPROD only. Reads job config from a local JSON file and the cron secret from
 * a local secret file outside the public web root. Emits one JSON audit line.
 *
 * It does not embed secrets in source control.
 */
declare(strict_types=1);

const COMPANY_ID = 'FENIX_CAPITAL';
const ENGINE_ID = 'SEO-001';
const ENVIRONMENT = 'PREPROD';
const CONNECT_TIMEOUT_SECONDS = 5;
const TOTAL_TIMEOUT_SECONDS = 35;

function emit(array $payload, int $exitCode = 0): never {
    $payload = array_merge([
        'company_id' => COMPANY_ID,
        'engine_id' => ENGINE_ID,
        'environment' => ENVIRONMENT,
        'observed_at' => gmdate('c'),
    ], $payload);
    $line = json_encode($payload, JSON_UNESCAPED_SLASHES) . PHP_EOL;
    $log = __DIR__ . '/job001_dispatcher.log';
    file_put_contents($log, $line, FILE_APPEND | LOCK_EX);
    fwrite(STDOUT, $line);
    exit($exitCode);
}

if ($argc !== 2) {
    emit(['ok'=>false,'error'=>'CONFIG_ARGUMENT_REQUIRED'], 2);
}

$configPath = $argv[1];
if (!is_file($configPath)) {
    emit(['ok'=>false,'error'=>'CONFIG_NOT_FOUND','config'=>$configPath], 2);
}

$config = json_decode((string)file_get_contents($configPath), true);
if (!is_array($config)) {
    emit(['ok'=>false,'error'=>'INVALID_CONFIG_JSON'], 2);
}

$required = ['job_id','legacy_pg_cron_job_id','url','body','secret_file'];
foreach ($required as $key) {
    if (!array_key_exists($key, $config)) {
        emit(['ok'=>false,'error'=>'MISSING_CONFIG_FIELD','field'=>$key], 2);
    }
}

$url = (string)$config['url'];
if (!str_starts_with($url, 'https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/')) {
    emit(['ok'=>false,'error'=>'TARGET_NOT_ALLOWLISTED'], 2);
}

$secretFile = (string)$config['secret_file'];
if (!is_file($secretFile)) {
    emit(['ok'=>false,'error'=>'SECRET_FILE_NOT_FOUND'], 2);
}
$secret = trim((string)file_get_contents($secretFile));
if ($secret === '') {
    emit(['ok'=>false,'error'=>'EMPTY_SECRET'], 2);
}

$payloadJson = json_encode($config['body'], JSON_UNESCAPED_SLASHES);
if ($payloadJson === false) {
    emit(['ok'=>false,'error'=>'INVALID_BODY'], 2);
}

$ch = curl_init($url);
if ($ch === false) {
    emit(['ok'=>false,'error'=>'CURL_INIT_FAILED'], 2);
}
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => CONNECT_TIMEOUT_SECONDS,
    CURLOPT_TIMEOUT => TOTAL_TIMEOUT_SECONDS,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payloadJson,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-fenix-cron-secret: ' . $secret,
        'User-Agent: CEREBRO-JOB-001-Hostinger/0.1',
    ],
]);

$body = curl_exec($ch);
if ($body === false) {
    $detail = curl_error($ch);
    curl_close($ch);
    emit(['ok'=>false,'error'=>'HTTP_REQUEST_FAILED','detail'=>$detail], 1);
}
$status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);

$decoded = json_decode($body, true);
$remoteOk = is_array($decoded) ? ($decoded['ok'] ?? null) : null;
emit([
    'ok' => $status >= 200 && $status < 300,
    'job_id' => (string)$config['job_id'],
    'legacy_pg_cron_job_id' => (int)$config['legacy_pg_cron_job_id'],
    'http_status' => $status,
    'remote_ok' => $remoteOk,
    'response_sha256' => hash('sha256', $body),
], ($status >= 200 && $status < 300) ? 0 : 1);
