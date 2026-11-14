<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_auth();

$fileName = app_sanitize_filename($_GET['file'] ?? null);
if ($fileName === null) {
    app_json(['error' => 'File not specified'], 400);
}

$filePath = UPLOAD_DIR . $fileName;

if (!file_exists($filePath) || !is_file($filePath)) {
    app_json(['error' => 'File not found'], 404);
}

$mime = mime_content_type($filePath) ?: 'application/octet-stream';
$disposition = isset($_GET['view']) ? 'inline' : 'attachment';

header('Content-Description: File Transfer');
header('Content-Type: ' . $mime);
header('Content-Disposition: ' . $disposition . '; filename="' . str_replace('"', '', $fileName) . '"');
header('Content-Length: ' . filesize($filePath));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');

readfile($filePath);
exit;
