<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();

header('Cache-Control: no-store');

$folder = app_sanitize_folder($_GET['folder'] ?? '');
$name = app_sanitize_filename($_GET['name'] ?? $_GET['file'] ?? null);

if ($name === null) {
    app_json(['error' => 'Name required'], 400);
}

$path = app_folder_path($folder) . $name;
app_json([
    'exists' => file_exists($path),
    'isFile' => is_file($path),
    'isFolder' => is_dir($path),
    'name' => $name,
    'folder' => $folder,
]);
