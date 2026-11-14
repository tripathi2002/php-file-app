<?php
// Returns which chunks exist for an upload session (resume support).
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_auth();

$fileName = app_sanitize_filename($_GET['fileName'] ?? null);
$uploadId = app_sanitize_upload_id($_GET['uploadId'] ?? null);
$totalChunks = app_sanitize_chunk_index($_GET['totalChunks'] ?? null);

if ($fileName === null && $uploadId === null) {
    app_json(['error' => 'fileName or uploadId required'], 400);
}

$fileKey = $uploadId !== null
    ? $uploadId
    : app_chunk_key(null, $fileName);
$chunkPath = CHUNK_DIR . $fileKey;

$received = [];
if (is_dir($chunkPath)) {
    foreach (glob($chunkPath . '/chunk_*') ?: [] as $path) {
        if (preg_match('/chunk_(\d+)$/', $path, $m)) {
            $received[] = (int) $m[1];
        }
    }
    sort($received);
}

$missing = [];
if ($totalChunks !== null) {
    for ($i = 0; $i < $totalChunks; $i++) {
        if (!in_array($i, $received, true)) {
            $missing[] = $i;
        }
    }
}

app_json([
    'uploadId' => $fileKey,
    'received' => $received,
    'missing' => $missing,
    'complete' => $totalChunks !== null && $missing === [],
]);
