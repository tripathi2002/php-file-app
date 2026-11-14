<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    app_json(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$fileName = app_sanitize_filename($data['fileName'] ?? ($_GET['file'] ?? null));

if ($fileName === null) {
    app_json(['error' => 'File name required'], 400);
}

$filePath = UPLOAD_DIR . $fileName;

if (!file_exists($filePath)) {
    app_json(['error' => 'File not found'], 404);
}

if (!unlink($filePath)) {
    app_json(['error' => 'Delete failed'], 500);
}

app_json([
    'message' => 'File deleted successfully',
    'file' => $fileName,
]);
