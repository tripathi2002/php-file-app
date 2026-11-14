<?php
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
$folder = app_sanitize_folder($data['folder'] ?? '');
$overwrite = !empty($data['overwrite']);

if ($fileName === null || $totalChunks === null || $totalChunks < 1) {
    app_json(['error' => 'Invalid request'], 400);
}

if (!app_extension_allowed($fileName)) {
    app_json([
        'error' => 'Invalid file type',
        'allowedExtensions' => app_allowed_extensions(),
    ], 400);
}

$fileKey = app_chunk_key($uploadId, $fileName);
$chunkPath = app_chunk_dir() . $fileKey;

if (!is_dir($chunkPath)) {
    app_json(['error' => 'Upload session not found'], 404);
}

$metaFile = $chunkPath . '/meta.json';
if (is_file($metaFile)) {
    $meta = json_decode((string) file_get_contents($metaFile), true);
    if (is_array($meta) && isset($meta['folder'])) {
        $folder = app_sanitize_folder($meta['folder']);
    }
}

app_ensure_dir(app_folder_path($folder), 0755);
$finalPath = app_folder_path($folder) . $fileName;

$mergedSize = 0;
for ($i = 0; $i < $totalChunks; $i++) {
    $chunkFile = $chunkPath . '/chunk_' . $i;
    if (!file_exists($chunkFile)) {
        app_json(['error' => "Missing chunk $i"], 400);
    }
    $mergedSize += (int) filesize($chunkFile);
}

$maxBytes = app_max_upload_bytes();
if ($mergedSize > $maxBytes) {
    app_json([
        'error' => 'File too large',
        'maxBytes' => $maxBytes,
        'maxMB' => round($maxBytes / (1024 * 1024), 1),
    ], 413);
}

if (file_exists($finalPath) && !$overwrite) {
    app_json(['error' => 'File already exists', 'file' => $fileName], 409);
}

$quota = app_storage_quota_bytes();
$used = app_dir_size(app_upload_dir());
$existing = (file_exists($finalPath) && $overwrite) ? (int) filesize($finalPath) : 0;
if ($used - $existing + $mergedSize > $quota) {
    app_json([
        'error' => 'Storage quota exceeded',
        'usedBytes' => $used,
        'quotaBytes' => $quota,
    ], 413);
}

$out = fopen($finalPath, 'wb');
if (!$out) {
    app_json(['error' => 'Cannot write destination file'], 500);
}

for ($i = 0; $i < $totalChunks; $i++) {
    $chunkFile = $chunkPath . '/chunk_' . $i;
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
@unlink($metaFile);
@rmdir($chunkPath);

app_json([
    'message' => 'File merged successfully',
    'file' => $fileName,
    'folder' => $folder,
]);
