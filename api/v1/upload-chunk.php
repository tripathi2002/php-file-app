<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';
require $root . '/rate-limit.php';
require $root . '/throttle.php';

app_require_auth();
applyThrottle(200);
checkRateLimit(5, 1);

$chunkIndex = app_sanitize_chunk_index($_POST['chunkIndex'] ?? null);
$totalChunks = app_sanitize_chunk_index($_POST['totalChunks'] ?? null);
$fileName = app_sanitize_filename($_POST['fileName'] ?? null);
$uploadId = app_sanitize_upload_id($_POST['uploadId'] ?? null);

if (!isset($_FILES['file']) || $chunkIndex === null || $fileName === null) {
    app_json(['error' => 'Invalid request'], 400);
}

if ($totalChunks !== null && $chunkIndex >= $totalChunks) {
    app_json(['error' => 'Invalid chunk index'], 400);
}

if (!app_extension_allowed($fileName)) {
    app_json(['error' => 'Invalid file type'], 400);
}

$file = $_FILES['file'];
if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
    app_json(['error' => 'Chunk upload failed'], 400);
}

$fileKey = app_chunk_key($uploadId, $fileName);
$chunkPath = CHUNK_DIR . $fileKey;
app_ensure_dir($chunkPath, 0755);

$dest = $chunkPath . '/chunk_' . $chunkIndex;
if (!move_uploaded_file($file['tmp_name'], $dest)) {
    app_json(['error' => 'Failed to store chunk'], 500);
}

app_json([
    'message' => "Chunk $chunkIndex uploaded",
    'uploadId' => $fileKey,
    'chunkIndex' => $chunkIndex,
]);
