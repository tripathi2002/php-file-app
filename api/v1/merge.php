<?php
// v1 merge contract — keep required fields and error shapes stable.
// Optional: uploadId (preferred chunk folder). Breaking changes → api/v2.
$root = dirname(__DIR__, 2);
require $root . '/config.php';
require $root . '/rate-limit.php';
require $root . '/throttle.php';

app_require_auth();
applyThrottle(500);
checkRateLimit(2, 1);

$data = json_decode(file_get_contents('php://input'), true) ?? [];

$fileName = app_sanitize_filename($data['fileName'] ?? null);
$totalChunks = app_sanitize_chunk_index($data['totalChunks'] ?? null);
$uploadId = app_sanitize_upload_id($data['uploadId'] ?? null);
$overwrite = !empty($data['overwrite']);

if ($fileName === null || $totalChunks === null || $totalChunks < 1) {
    app_json([
        'error' => 'Invalid request',
        'received' => $data,
    ], 400);
}

if (!app_extension_allowed($fileName)) {
    app_json(['error' => 'Invalid file type'], 400);
}

$fileKey = app_chunk_key($uploadId, $fileName);
$chunkPath = CHUNK_DIR . $fileKey;
$finalPath = UPLOAD_DIR . $fileName;

if (!is_dir($chunkPath)) {
    app_json(['error' => 'Upload session not found'], 404);
}

if (file_exists($finalPath) && !$overwrite) {
    app_json(['error' => 'File already exists', 'file' => $fileName], 409);
}

$out = fopen($finalPath, 'wb');
if (!$out) {
    app_json(['error' => 'Cannot write destination file'], 500);
}

for ($i = 0; $i < $totalChunks; $i++) {
    $chunkFile = $chunkPath . '/chunk_' . $i;

    if (!file_exists($chunkFile)) {
        fclose($out);
        @unlink($finalPath);
        app_json(['error' => "Missing chunk $i"], 400);
    }

    $in = fopen($chunkFile, 'rb');
    if (!$in) {
        fclose($out);
        @unlink($finalPath);
        app_json(['error' => "Cannot read chunk $i"], 500);
    }
    while ($buff = fread($in, 8192)) {
        fwrite($out, $buff);
    }
    fclose($in);
}

fclose($out);

foreach (glob($chunkPath . '/chunk_*') ?: [] as $chunk) {
    @unlink($chunk);
}
@rmdir($chunkPath);

app_json([
    'message' => 'File merged successfully',
    'file' => $fileName,
]);
