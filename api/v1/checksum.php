<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();

header('Cache-Control: no-store');

$folder = app_sanitize_folder($_GET['folder'] ?? '');
$name = app_sanitize_filename($_GET['name'] ?? $_GET['file'] ?? null);
$algo = strtolower(trim((string) ($_GET['algo'] ?? 'sha256')));

if ($name === null) {
    app_json(['error' => 'Name required'], 400);
}

if (!in_array($algo, ['md5', 'sha1', 'sha256'], true)) {
    app_json(['error' => 'Unsupported algo'], 400);
}

$path = app_folder_path($folder) . $name;
if (!is_file($path)) {
    app_json(['error' => 'File not found'], 404);
}

$size = (int) (@filesize($path) ?: 0);
if ($size > 100 * 1024 * 1024) {
    app_json(['error' => 'File too large to hash here (max 100 MB)'], 413);
}

$hash = @hash_file($algo, $path);
if ($hash === false) {
    app_json(['error' => 'Hash failed'], 500);
}

app_json([
    'name' => $name,
    'folder' => $folder,
    'algo' => $algo,
    'hash' => $hash,
    'size' => $size,
]);
