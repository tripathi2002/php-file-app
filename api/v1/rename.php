<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_auth();

if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['PUT', 'POST'], true)) {
    app_json(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];

$oldName = app_sanitize_filename($data['oldName'] ?? null);
$newName = app_sanitize_filename($data['newName'] ?? null);

if ($oldName === null || $newName === null) {
    app_json(['error' => 'Invalid request'], 400);
}

$ext = pathinfo($oldName, PATHINFO_EXTENSION);
if ($ext !== '' && pathinfo($newName, PATHINFO_EXTENSION) === '') {
    $newName .= '.' . $ext;
    $newName = app_sanitize_filename($newName);
    if ($newName === null) {
        app_json(['error' => 'Invalid request'], 400);
    }
}

if (!app_extension_allowed($newName)) {
    app_json([
        'error' => 'Invalid file type',
        'allowedExtensions' => app_allowed_extensions(),
    ], 400);
}

$oldPath = UPLOAD_DIR . $oldName;
$newPath = UPLOAD_DIR . $newName;

if (!file_exists($oldPath)) {
    app_json(['error' => 'File not found'], 404);
}

if (file_exists($newPath)) {
    app_json(['error' => 'File with new name already exists'], 409);
}

if (!rename($oldPath, $newPath)) {
    app_json(['error' => 'Rename failed'], 500);
}

app_json(['message' => 'Renamed successfully', 'file' => $newName]);
