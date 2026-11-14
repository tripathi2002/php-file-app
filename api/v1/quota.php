<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();

header('Cache-Control: no-store');

$used = app_dir_size(app_upload_dir());
$quota = app_storage_quota_bytes();
$pct = $quota > 0 ? round(($used / $quota) * 100, 1) : 0;

app_json([
    'space' => app_is_public_space() ? 'public' : 'personal',
    'usedBytes' => $used,
    'quotaBytes' => $quota,
    'remainingBytes' => max(0, $quota - $used),
    'percent' => $pct,
    'warn' => $pct >= 80,
    'critical' => $pct >= 95,
]);
