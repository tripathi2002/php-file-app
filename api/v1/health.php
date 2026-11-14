<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

header('Content-Type: application/json');
header('Cache-Control: no-store');

if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD'], true)) {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'error' => 'Method not allowed']);
    exit;
}

$publicRoot = app_public_root();
$checks = [
    'storageWritable' => is_dir(STORAGE_ROOT) && is_writable(STORAGE_ROOT),
    'publicWritable' => is_dir($publicRoot) && is_writable($publicRoot),
    'publicFilesWritable' => is_dir($publicRoot . '/files') && is_writable($publicRoot . '/files'),
    'usersWritable' => is_dir(app_users_dir()) && is_writable(app_users_dir()),
    'sessionsWritable' => is_dir(app_sessions_dir()) && is_writable(app_sessions_dir()),
    'zipAvailable' => class_exists('ZipArchive'),
];
$ok = !in_array(false, [
    $checks['storageWritable'],
    $checks['publicWritable'],
    $checks['publicFilesWritable'],
    $checks['usersWritable'],
    $checks['sessionsWritable'],
], true);

http_response_code($ok ? 200 : 503);
echo json_encode([
    'status' => $ok ? 'ok' : 'degraded',
    'api' => APP_API_VERSION,
    'checks' => $checks,
    'time' => gmdate('c'),
]);
