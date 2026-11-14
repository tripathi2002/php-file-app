<?php
/** Create nested folder path in one call, e.g. photos/2026/trip */
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();
app_require_writable_space();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    app_json(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$base = app_sanitize_folder($data['folder'] ?? '');
$path = app_sanitize_folder($data['path'] ?? $data['name'] ?? '');

if ($path === '') {
    app_json(['error' => 'Path required'], 400);
}

$full = $base === '' ? $path : $base . '/' . $path;
$full = app_sanitize_folder($full);
if ($full === '') {
    app_json(['error' => 'Invalid path'], 400);
}

if (substr_count($full, '/') + 1 > 5) {
    app_json(['error' => 'Folder too deep (max 5 levels)'], 400);
}

$created = [];
$acc = '';
foreach (explode('/', $full) as $part) {
    $parent = $acc;
    $acc = $acc === '' ? $part : $acc . '/' . $part;
    $dir = app_folder_path($parent) . $part;
    if (is_dir($dir)) {
        continue;
    }
    if (file_exists($dir)) {
        app_json(['error' => 'Name conflicts with a file', 'path' => $acc], 409);
    }
    if ($parent !== '' && !app_folder_exists($parent)) {
        app_json(['error' => 'Parent missing', 'path' => $parent], 404);
    }
    if (!@mkdir($dir, 0755, false)) {
        app_json(['error' => 'Could not create folder', 'path' => $acc], 500);
    }
    $created[] = $acc;
}

app_json([
    'message' => 'Path ready',
    'path' => $full,
    'created' => $created,
]);
