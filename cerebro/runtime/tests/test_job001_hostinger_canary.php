<?php
// Minimal static contract check for the Hostinger canary runner.
// Intentionally no network call.
$path = __DIR__ . '/../deploy/hostinger/job001_wp_bridge_canary.php';
$source = file_get_contents($path);
if ($source === false) {
    fwrite(STDERR, "runner_missing\n");
    exit(1);
}
$required = [
    "READ_ONLY_CANARY",
    "FENIX_CAPITAL",
    "PREPROD",
    "legacy_pg_cron_job_id' => 13",
    "CURLOPT_FOLLOWLOCATION => false",
    "response_sha256",
];
foreach ($required as $needle) {
    if (strpos($source, $needle) === false) {
        fwrite(STDERR, "missing_contract:" . $needle . "\n");
        exit(1);
    }
}
$forbidden = [
    "service_role",
    "SUPABASE_KEY",
    "Authorization: Bearer",
    "wp_insert",
    "wp_update",
    "INSERT INTO",
    "UPDATE ",
    "DELETE FROM",
];
foreach ($forbidden as $needle) {
    if (stripos($source, $needle) !== false) {
        fwrite(STDERR, "forbidden_capability:" . $needle . "\n");
        exit(1);
    }
}
fwrite(STDOUT, "JOB001_HOSTINGER_CANARY_STATIC_CONTRACT_PASS\n");
