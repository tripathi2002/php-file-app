<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();
app_require_writable_space();

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
    $recursive = !empty($data['recursive']);
    $items = array_diff(scandir($path) ?: [], ['.', '..', '.gitkeep', '.htaccess']);
    if (count($items) > 0 && !$recursive) {
        app_json(['error' => 'Folder is not empty', 'hint' => 'Pass recursive:true to delete contents'], 409);
    }
    if ($recursive) {
        if (!app_delete_tree($path)) {
            app_json(['error' => 'Delete failed'], 500);
        }
    } elseif (!@rmdir($path)) {
        app_json(['error' => 'Delete failed'], 500);
    }
    app_json(['message' => 'Folder deleted', 'name' => $fileName, 'recursive' => $recursive]);
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
