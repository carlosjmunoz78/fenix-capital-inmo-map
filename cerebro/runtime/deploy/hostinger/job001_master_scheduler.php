<?php
/**
 * JOB-001 Hostinger master scheduler.
 *
 * One cron entry may run this script every minute. The script preserves the
 * legacy PREPROD minute offsets and only dispatches explicitly enabled jobs.
 * It calls the isolated CEREBRO JOB-001 gateway; it never embeds Supabase
 * service-role credentials or legacy cron secrets.
 */
declare(strict_types=1);

const COMPANY_ID = 'FENIX_CAPITAL';
const ENGINE_ID = 'SEO-001';
const ENVIRONMENT = 'PREPROD';
const GATEWAY_URL = 'https://hnqlnvakzaywtafeiybt.supabase.co/functions/v1/cerebro-job001-gateway-preprod';
const CONNECT_TIMEOUT_SECONDS = 5;
const TOTAL_TIMEOUT_SECONDS = 40;

$jobs = [
    2  => ['name'=>'seo001-weekly-orchestrator',             'schedule'=>'0 6 * * 1'],
    5  => ['name'=>'seo001-city-autopilot-worker',            'schedule'=>'*/15 * * * *'],
    6  => ['name'=>'seo001-growth-email-worker',              'schedule'=>'7,22,37,52 * * * *'],
    7  => ['name'=>'seo001-page-quality-probe',               'schedule'=>'8,23,38,53 * * * *'],
    8  => ['name'=>'seo001-active-city-quality-reconcile',    'schedule'=>'10,25,40,55 * * * *'],
    9  => ['name'=>'seo001-wp-action-worker',                 'schedule'=>'*/5 * * * *'],
    10 => ['name'=>'seo001-downloadable-qa',                  'schedule'=>'17,47 * * * *'],
    11 => ['name'=>'seo001-active-city-growth-bootstrap',     'schedule'=>'2,17,32,47 * * * *'],
    12 => ['name'=>'seo001-lead-magnet-builder',              'schedule'=>'11,26,41,56 * * * *'],
    13 => ['name'=>'seo001-wp-bridge-probe',                  'schedule'=>'3,18,33,48 * * * *'],
    14 => ['name'=>'seo001-wp-bridge-reconcile',              'schedule'=>'5,20,35,50 * * * *'],
    15 => ['name'=>'seo001-active-city-baseline',             'schedule'=>'9,39 * * * *'],
    16 => ['name'=>'seo001-conversion-e2e',                   'schedule'=>'13,43 * * * *'],
    17 => ['name'=>'seo001-active-city-nurture-e2e',          'schedule'=>'23,53 * * * *'],
    18 => ['name'=>'seo001-active-city-form-enable',          'schedule'=>'7,22,37,52 * * * *'],
    19 => ['name'=>'seo001-growth-control-reconcile',         'schedule'=>'1,16,31,46 * * * *'],
    20 => ['name'=>'seo001-active-city-autonomy-proof',       'schedule'=>'14,44 * * * *'],
    21 => ['name'=>'seo001-mobile-qa',                        'schedule'=>'12,42 * * * *'],
    22 => ['name'=>'seo001-pilot-plugin-certificate',         'schedule'=>'6,21,36,51 * * * *'],
    23 => ['name'=>'seo001-rollout-control-refresh',          'schedule'=>'7,22,37,52 * * * *'],
    24 => ['name'=>'seo-gsc-notion-sync',                     'schedule'=>'36 11 * * 3'],
    25 => ['name'=>'social-t72-watchdog',                      'schedule'=>'8 * * * *'],
];

$baseDir = __DIR__;
$configFile = $baseDir . '/job001_enabled_jobs.json';
$secretFile = $baseDir . '/secrets/cerebro_job001_gateway_preprod.secret';
$logFile = $baseDir . '/job001_master_scheduler.log';
$stateFile = $baseDir . '/job001_master_scheduler_state.json';
$lockFile = $baseDir . '/job001_master_scheduler.lock';

function logLine(string $logFile, array $payload): void {
    $payload = array_merge([
        'company_id'=>COMPANY_ID,
        'engine_id'=>ENGINE_ID,
        'environment'=>ENVIRONMENT,
        'observed_at'=>gmdate('c'),
    ], $payload);
    file_put_contents($logFile, json_encode($payload, JSON_UNESCAPED_SLASHES) . PHP_EOL, FILE_APPEND | LOCK_EX);
}

function fieldMatches(string $field, int $value, int $min, int $max): bool {
    if ($field === '*') return true;
    if (str_starts_with($field, '*/')) {
        $step = (int)substr($field, 2);
        return $step > 0 && (($value - $min) % $step === 0);
    }
    foreach (explode(',', $field) as $part) {
        if ((int)$part === $value) return true;
    }
    return false;
}

function cronMatches(string $expr, DateTimeImmutable $dt): bool {
    $parts = preg_split('/\s+/', trim($expr));
    if (!$parts || count($parts) !== 5) return false;
    [$m,$h,$dom,$mon,$dow] = $parts;
    $minute = (int)$dt->format('i');
    $hour = (int)$dt->format('G');
    $day = (int)$dt->format('j');
    $month = (int)$dt->format('n');
    $weekday = (int)$dt->format('w'); // Sunday=0
    return fieldMatches($m,$minute,0,59)
        && fieldMatches($h,$hour,0,23)
        && fieldMatches($dom,$day,1,31)
        && fieldMatches($mon,$month,1,12)
        && fieldMatches($dow,$weekday,0,7);
}

function dispatchJob(int $jobId, string $secret): array {
    $payload = json_encode(['job_id'=>$jobId], JSON_UNESCAPED_SLASHES);
    $ch = curl_init(GATEWAY_URL);
    if ($ch === false) return ['ok'=>false,'error'=>'CURL_INIT_FAILED'];
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER=>true,
        CURLOPT_FOLLOWLOCATION=>false,
        CURLOPT_CONNECTTIMEOUT=>CONNECT_TIMEOUT_SECONDS,
        CURLOPT_TIMEOUT=>TOTAL_TIMEOUT_SECONDS,
        CURLOPT_POST=>true,
        CURLOPT_POSTFIELDS=>$payload,
        CURLOPT_HTTPHEADER=>[
            'Content-Type: application/json',
            'x-cerebro-job-secret: ' . $secret,
            'User-Agent: CEREBRO-JOB-001-Hostinger-Master/0.1',
        ],
    ]);
    $body = curl_exec($ch);
    if ($body === false) {
        $error = curl_error($ch);
        curl_close($ch);
        return ['ok'=>false,'error'=>'HTTP_REQUEST_FAILED','detail'=>$error];
    }
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    $decoded = json_decode($body, true);
    return [
        'ok'=>$status >= 200 && $status < 300,
        'http_status'=>$status,
        'remote_ok'=>is_array($decoded) ? ($decoded['ok'] ?? null) : null,
        'remote_state'=>is_array($decoded) ? ($decoded['state'] ?? null) : null,
        'response_sha256'=>hash('sha256',$body),
    ];
}

$lock = fopen($lockFile, 'c+');
if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
    logLine($logFile, ['ok'=>true,'state'=>'SKIP_LOCKED']);
    exit(0);
}

try {
    if (!is_file($configFile)) {
        logLine($logFile, ['ok'=>false,'state'=>'CONFIG_NOT_FOUND']);
        exit(2);
    }
    $config = json_decode((string)file_get_contents($configFile), true);
    if (!is_array($config) || !isset($config['enabled_job_ids']) || !is_array($config['enabled_job_ids'])) {
        logLine($logFile, ['ok'=>false,'state'=>'INVALID_CONFIG']);
        exit(2);
    }

    $enabled = array_values(array_unique(array_map('intval', $config['enabled_job_ids'])));
    foreach ($enabled as $id) {
        if (!isset($jobs[$id])) {
            logLine($logFile, ['ok'=>false,'state'=>'JOB_NOT_ALLOWLISTED','job_id'=>$id]);
            exit(2);
        }
    }

    $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $minuteKey = $now->format('Y-m-d\TH:i');
    $state = is_file($stateFile) ? json_decode((string)file_get_contents($stateFile), true) : [];
    if (!is_array($state)) $state = [];

    $due = [];
    foreach ($enabled as $id) {
        if (cronMatches($jobs[$id]['schedule'], $now)) $due[] = $id;
    }

    if (!$due) {
        logLine($logFile, ['ok'=>true,'state'=>'NO_DUE_JOBS','minute'=>$minuteKey,'enabled_job_ids'=>$enabled]);
        exit(0);
    }

    if (!is_file($secretFile)) {
        logLine($logFile, ['ok'=>false,'state'=>'SECRET_FILE_NOT_FOUND','due_job_ids'=>$due]);
        exit(2);
    }
    $secret = trim((string)file_get_contents($secretFile));
    if ($secret === '') {
        logLine($logFile, ['ok'=>false,'state'=>'EMPTY_SECRET','due_job_ids'=>$due]);
        exit(2);
    }

    foreach ($due as $id) {
        $key = $minuteKey . ':' . $id;
        if (($state[$key] ?? null) === 'done') {
            logLine($logFile, ['ok'=>true,'state'=>'SKIP_ALREADY_DONE','job_id'=>$id,'minute'=>$minuteKey]);
            continue;
        }
        $result = dispatchJob($id, $secret);
        logLine($logFile, array_merge([
            'job_id'=>$id,
            'job_name'=>$jobs[$id]['name'],
            'scheduled_minute'=>$minuteKey,
            'state'=>$result['ok'] ? 'DISPATCHED' : 'DISPATCH_FAILED',
        ], $result));
        if ($result['ok']) {
            $state[$key] = 'done';
            file_put_contents($stateFile, json_encode($state, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), LOCK_EX);
        }
    }
} finally {
    flock($lock, LOCK_UN);
    fclose($lock);
}
