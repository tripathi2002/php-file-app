<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();

header('Cache-Control: no-store');

$folder = app_sanitize_folder($_GET['folder'] ?? '');
$dir = app_folder_path($folder);
if (!is_dir($dir)) {
    app_json(['error' => 'Folder not found'], 404);
}

$files = 0;
$folders = 0;
foreach (scandir($dir) ?: [] as $name) {
    if ($name === '.' || $name === '..' || $name === '.gitkeep' || $name === '.htaccess' || $name[0] === '.') {
        continue;
    }
    $path = $dir . $name;
    if (is_dir($path)) {
        $folders++;
    } elseif (is_file($path)) {
        $files++;
    }
}

app_json([
    'folder' => $folder,
    'files' => $files,
    'folders' => $folders,
    'total' => $files + $folders,
]);
