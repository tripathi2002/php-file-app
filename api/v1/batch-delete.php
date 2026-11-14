<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();
app_require_writable_space();

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    app_json(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$folder = app_sanitize_folder($data['folder'] ?? '');
$items = $data['items'] ?? $data['names'] ?? [];

if (!is_array($items) || count($items) === 0) {
    app_json(['error' => 'No items selected'], 400);
}

if (count($items) > 50) {
    app_json(['error' => 'Select at most 50 items'], 400);
}

if (!app_folder_exists($folder)) {
    app_json(['error' => 'Folder not found'], 404);
}

$deleted = [];
$failed = [];

foreach ($items as $item) {
    $isFolder = false;
    $nameRaw = null;
    if (is_array($item)) {
        $nameRaw = $item['name'] ?? $item['fileName'] ?? null;
        $isFolder = !empty($item['isFolder']);
    } else {
        $nameRaw = $item;
    }
    $name = app_sanitize_filename(is_string($nameRaw) ? $nameRaw : null);
    if ($name === null) {
        $failed[] = ['name' => (string) $nameRaw, 'error' => 'Invalid name'];
        continue;
    }
    $path = app_folder_path($folder) . $name;
    if ($isFolder) {
        if (!is_dir($path)) {
            $failed[] = ['name' => $name, 'error' => 'Folder not found'];
            continue;
        }
        $children = array_diff(scandir($path) ?: [], ['.', '..', '.gitkeep', '.htaccess']);
        if (count($children) > 0) {
            $failed[] = ['name' => $name, 'error' => 'Folder is not empty'];
            continue;
        }
        if (@rmdir($path)) {
            $deleted[] = ['name' => $name, 'isFolder' => true];
        } else {
            $failed[] = ['name' => $name, 'error' => 'Delete failed'];
        }
        continue;
    }

    if (!is_file($path)) {
        $failed[] = ['name' => $name, 'error' => 'File not found'];
        continue;
    }
    if (@unlink($path)) {
        $deleted[] = ['name' => $name, 'isFolder' => false];
    } else {
        $failed[] = ['name' => $name, 'error' => 'Delete failed'];
    }
}

app_json([
    'message' => count($deleted) . ' deleted',
    'deleted' => $deleted,
    'failed' => $failed,
    'ok' => count($failed) === 0,
]);
