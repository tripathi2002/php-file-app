<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$fileName = $data['fileName'] ?? null;

if (!$fileName) {
    echo json_encode(['error' => 'Invalid request']);
    exit;
}

$fileKey = md5($fileName);
$chunkPath = CHUNK_DIR . $fileKey;

if (is_dir($chunkPath)) {
    array_map('unlink', glob("$chunkPath/chunk_*"));
    rmdir($chunkPath);
}

echo json_encode(['message' => 'Cancelled']);
