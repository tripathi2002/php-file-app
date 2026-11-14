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

$checks = [
    'storageWritable' => is_dir(STORAGE_ROOT) && is_writable(STORAGE_ROOT),
    'usersWritable' => is_dir(app_users_dir()) && is_writable(app_users_dir()),
    'sessionsWritable' => is_dir(app_sessions_dir()) && is_writable(app_sessions_dir()),
];
$ok = !in_array(false, $checks, true);

http_response_code($ok ? 200 : 503);
echo json_encode([
    'status' => $ok ? 'ok' : 'degraded',
    'api' => APP_API_VERSION,
    'checks' => $checks,
    'time' => gmdate('c'),
]);
