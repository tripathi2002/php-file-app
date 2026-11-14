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
    app_json(['error' => 'Upload failed'], 400);
}

$fileName = app_sanitize_filename($file['name'] ?? null);
if ($fileName === null) {
    app_json(['error' => 'Invalid file name'], 400);
}

if (!app_extension_allowed($fileName)) {
    app_json(['error' => 'Invalid file type'], 400);
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
