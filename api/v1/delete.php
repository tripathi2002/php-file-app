<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    app_json(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$folder = app_sanitize_folder($data['folder'] ?? '');
$fileName = app_sanitize_filename($data['fileName'] ?? ($_GET['file'] ?? null));
$isFolder = !empty($data['isFolder']);

if ($fileName === null) {
    app_json(['error' => 'Name required'], 400);
}

$path = app_folder_path($folder) . $fileName;

if ($isFolder) {
    if (!is_dir($path)) {
        app_json(['error' => 'Folder not found'], 404);
    }
    $items = array_diff(scandir($path) ?: [], ['.', '..', '.gitkeep', '.htaccess']);
    if (count($items) > 0) {
        app_json(['error' => 'Folder is not empty'], 409);
    }
    if (!@rmdir($path)) {
        app_json(['error' => 'Delete failed'], 500);
    }
    app_json(['message' => 'Folder deleted', 'name' => $fileName]);
}

if (!is_file($path)) {
    app_json(['error' => 'File not found'], 404);
}

if (!unlink($path)) {
    app_json(['error' => 'Delete failed'], 500);
}

app_json([
    'message' => 'File deleted successfully',
    'file' => $fileName,
]);
