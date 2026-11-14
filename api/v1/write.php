<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();
app_require_writable_space();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    app_json(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$folder = app_sanitize_folder($data['folder'] ?? '');
$name = app_sanitize_filename($data['name'] ?? $data['fileName'] ?? null);
$content = $data['content'] ?? '';
$overwrite = !empty($data['overwrite']);

if ($name === null) {
    app_json(['error' => 'Name required'], 400);
}

$ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
if (!in_array($ext, ['txt', 'md', 'csv', 'json'], true)) {
    app_json(['error' => 'Only .txt .md .csv .json can be created in-app'], 400);
}

if (!is_string($content)) {
    app_json(['error' => 'Invalid content'], 400);
}

if (strlen($content) > 512 * 1024) {
    app_json(['error' => 'Text too large (max 512 KB)'], 413);
}

if (!app_folder_exists($folder)) {
    app_json(['error' => 'Folder not found'], 404);
}

$quota = app_storage_quota_bytes();
$used = app_dir_size(app_upload_dir());
$size = strlen($content);
$path = app_folder_path($folder) . $name;
$existing = is_file($path) ? (int) (@filesize($path) ?: 0) : 0;
if ($used - $existing + $size > $quota) {
    app_json(['error' => 'Storage quota exceeded'], 413);
}

if (is_file($path) && !$overwrite) {
    app_json(['error' => 'File already exists', 'file' => $name], 409);
}

app_ensure_dir(app_folder_path($folder), 0755);
if (@file_put_contents($path, $content) === false) {
    app_json(['error' => 'Write failed'], 500);
}

app_json([
    'message' => 'Saved',
    'name' => $name,
    'folder' => $folder,
    'size' => $size,
]);
