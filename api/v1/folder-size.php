<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();

header('Cache-Control: no-store');

$folder = app_sanitize_folder($_GET['folder'] ?? '');
if ($folder !== '' && !app_folder_exists($folder)) {
    app_json(['error' => 'Folder not found'], 404);
}

$path = rtrim(app_folder_path($folder), '/\\');
$bytes = app_dir_size($path . '/');

app_json([
    'folder' => $folder,
    'bytes' => $bytes,
    'human' => round($bytes / (1024 * 1024), 2) . ' MB',
]);
