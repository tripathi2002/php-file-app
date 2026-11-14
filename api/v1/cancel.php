<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_auth();

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$fileName = app_sanitize_filename($data['fileName'] ?? null);
$uploadId = app_sanitize_upload_id($data['uploadId'] ?? null);

if ($fileName === null && $uploadId === null) {
    app_json(['error' => 'Invalid request'], 400);
}

$fileKey = $uploadId !== null
    ? $uploadId
    : app_chunk_key(null, $fileName);
$chunkPath = CHUNK_DIR . $fileKey;

if (!is_dir($chunkPath)) {
    app_json(['error' => 'Upload session not found', 'cancelled' => false], 404);
}

foreach (glob($chunkPath . '/chunk_*') ?: [] as $chunk) {
    @unlink($chunk);
}
@rmdir($chunkPath);

app_json(['message' => 'Cancelled', 'cancelled' => true]);
