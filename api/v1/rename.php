<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();
app_require_writable_space();

if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['PUT', 'POST'], true)) {
    app_json(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$folder = app_sanitize_folder($data['folder'] ?? '');
$oldName = app_sanitize_filename($data['oldName'] ?? null);
$newName = app_sanitize_filename($data['newName'] ?? null);
$isFolder = !empty($data['isFolder']);

if ($oldName === null || $newName === null) {
    app_json(['error' => 'Invalid request'], 400);
}

if ($isFolder) {
    if (str_contains($newName, '.')) {
        app_json(['error' => 'Folder name cannot contain a dot'], 400);
    }
} else {
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
}

$oldPath = app_folder_path($folder) . $oldName;
$newPath = app_folder_path($folder) . $newName;

if ($isFolder ? !is_dir($oldPath) : !is_file($oldPath)) {
    app_json(['error' => 'Not found'], 404);
}

if (file_exists($newPath)) {
    app_json(['error' => 'Name already exists'], 409);
}

if (!rename($oldPath, $newPath)) {
    app_json(['error' => 'Rename failed'], 500);
}

app_json(['message' => 'Renamed successfully', 'name' => $newName]);
