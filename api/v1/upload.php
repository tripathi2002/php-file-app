<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    app_json(['error' => 'Method not allowed'], 405);
}

if (!isset($_FILES['file'])) {
    app_json(['error' => 'No file uploaded'], 400);
}

$file = $_FILES['file'];
if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
    $code = $file['error'] ?? UPLOAD_ERR_NO_FILE;
    if (in_array($code, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
        app_json([
            'error' => 'File too large',
            'maxBytes' => app_max_upload_bytes(),
            'maxMB' => round(app_max_upload_bytes() / (1024 * 1024), 1),
        ], 413);
    }
    app_json(['error' => 'Upload failed'], 400);
}

$fileName = app_sanitize_filename($file['name'] ?? null);
if ($fileName === null) {
    app_json(['error' => 'Invalid file name'], 400);
}

if (!app_extension_allowed($fileName)) {
    app_json([
        'error' => 'Invalid file type',
        'allowedExtensions' => app_allowed_extensions(),
    ], 400);
}

$maxBytes = app_max_upload_bytes();
if (($file['size'] ?? 0) > $maxBytes) {
    app_json([
        'error' => 'File too large',
        'maxBytes' => $maxBytes,
        'maxMB' => round($maxBytes / (1024 * 1024), 1),
    ], 413);
}

$quota = app_storage_quota_bytes();
$used = app_dir_size(UPLOAD_DIR);
if ($used + (int) ($file['size'] ?? 0) > $quota) {
    app_json([
        'error' => 'Storage quota exceeded',
        'usedBytes' => $used,
        'quotaBytes' => $quota,
    ], 413);
}

$targetPath = UPLOAD_DIR . $fileName;
if (file_exists($targetPath)) {
    app_json(['error' => 'File already exists', 'file' => $fileName], 409);
}

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    app_json(['error' => 'Upload failed'], 500);
}

app_json([
    'message' => 'File uploaded successfully',
    'file' => $fileName,
]);
