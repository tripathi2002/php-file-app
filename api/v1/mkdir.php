<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();
app_require_writable_space();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    app_json(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$parent = app_sanitize_folder($data['folder'] ?? '');
$name = app_sanitize_filename($data['name'] ?? null);

if ($name === null) {
    app_json(['error' => 'Folder name required'], 400);
}

// Folder names should not look like files with dangerous extensions
if (str_contains($name, '.')) {
    app_json(['error' => 'Folder name cannot contain a dot'], 400);
}

if ($parent !== '' && !app_folder_exists($parent)) {
    app_json(['error' => 'Parent folder not found'], 404);
}

$depth = $parent === '' ? 1 : (substr_count($parent, '/') + 2);
if ($depth > 5) {
    app_json(['error' => 'Folder too deep (max 5 levels)'], 400);
}

$path = app_folder_path($parent) . $name;
if (file_exists($path)) {
    app_json(['error' => 'Folder already exists'], 409);
}

if (!@mkdir($path, 0755, false)) {
    app_json(['error' => 'Could not create folder'], 500);
}

$rel = $parent === '' ? $name : $parent . '/' . $name;
app_json([
    'message' => 'Folder created',
    'folder' => $rel,
    'name' => $name,
]);
