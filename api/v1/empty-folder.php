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

if (!app_folder_exists($folder)) {
    app_json(['error' => 'Folder not found'], 404);
}

$dir = rtrim(app_folder_path($folder), '/\\');
$rootUpload = realpath(app_upload_dir());
$real = realpath($dir);
if ($rootUpload === false || $real === false) {
    app_json(['error' => 'Folder not found'], 404);
}

$rootNorm = rtrim(str_replace('\\', '/', $rootUpload), '/');
$realNorm = rtrim(str_replace('\\', '/', $real), '/');
if ($realNorm !== $rootNorm && !str_starts_with($realNorm, $rootNorm . '/')) {
    app_json(['error' => 'Invalid folder'], 400);
}

$deletedFiles = 0;
$deletedFolders = 0;

foreach (scandir($real) ?: [] as $name) {
    if ($name === '.' || $name === '..' || $name === '.gitkeep' || $name === '.htaccess') {
        continue;
    }
    $path = $real . DIRECTORY_SEPARATOR . $name;
    if (is_dir($path)) {
        if (app_delete_tree($path)) {
            $deletedFolders++;
        }
    } elseif (is_file($path)) {
        if (@unlink($path)) {
            $deletedFiles++;
        }
    }
}

app_json([
    'message' => 'Folder emptied',
    'folder' => $folder,
    'deletedFiles' => $deletedFiles,
    'deletedFolders' => $deletedFolders,
]);
