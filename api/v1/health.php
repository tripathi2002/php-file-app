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
    'uploadsWritable' => is_dir(UPLOAD_DIR) && is_writable(UPLOAD_DIR),
    'chunksWritable'  => is_dir(CHUNK_DIR) && is_writable(CHUNK_DIR),
];
$ok = !in_array(false, $checks, true);

http_response_code($ok ? 200 : 503);
echo json_encode([
    'status' => $ok ? 'ok' : 'degraded',
    'api'    => APP_API_VERSION,
    'checks' => $checks,
    'time'   => gmdate('c'),
]);
