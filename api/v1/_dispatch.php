<?php
$appRoot = dirname(__DIR__, 2);
$endpoint = basename($_SERVER['SCRIPT_FILENAME']);

$allowed = [
    'merge.php',
    'upload-chunk.php',
    'list.php',
    'download.php',
    'delete.php',
    'rename.php',
    'cancel.php',
    'upload.php',
    'version.php',
    'generate-key.php',
];

if (!in_array($endpoint, $allowed, true)) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Unknown v1 endpoint']);
    exit;
}

chdir($appRoot);
require $appRoot . DIRECTORY_SEPARATOR . $endpoint;
