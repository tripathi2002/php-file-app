<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();
app_require_writable_space();

if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['POST', 'PUT'], true)) {
    app_json(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$fromFolder = app_sanitize_folder($data['fromFolder'] ?? $data['folder'] ?? '');
$toFolder = app_sanitize_folder($data['toFolder'] ?? '');
$name = app_sanitize_filename($data['name'] ?? $data['fileName'] ?? null);
$isFolder = !empty($data['isFolder']);

if ($name === null) {
    app_json(['error' => 'Name required'], 400);
}

if (!app_folder_exists($fromFolder) || !app_folder_exists($toFolder)) {
    app_json(['error' => 'Folder not found'], 404);
}

$src = app_folder_path($fromFolder) . $name;
$dst = app_folder_path($toFolder) . $name;

if ($isFolder) {
    if (!is_dir($src)) {
        app_json(['error' => 'Folder not found'], 404);
    }
    $srcRel = $fromFolder === '' ? $name : $fromFolder . '/' . $name;
    $dstRel = $toFolder === '' ? $name : $toFolder . '/' . $name;
    if ($toFolder === $srcRel || str_starts_with($toFolder, $srcRel . '/')) {
        app_json(['error' => 'Cannot move a folder into itself'], 400);
    }
    $depth = $toFolder === '' ? 1 : (substr_count($toFolder, '/') + 2);
    if ($depth > 5) {
        app_json(['error' => 'Folder depth limit is 5'], 400);
    }
} else {
    if (!is_file($src)) {
        app_json(['error' => 'File not found'], 404);
    }
}

if ($fromFolder === $toFolder) {
    app_json(['error' => 'Already in that folder'], 400);
}

if (file_exists($dst)) {
    app_json(['error' => 'Name already exists in destination'], 409);
}

app_ensure_dir(app_folder_path($toFolder), 0755);

if (!@rename($src, $dst)) {
    app_json(['error' => 'Move failed'], 500);
}

app_json([
    'message' => 'Moved successfully',
    'name' => $name,
    'fromFolder' => $fromFolder,
    'toFolder' => $toFolder,
]);
