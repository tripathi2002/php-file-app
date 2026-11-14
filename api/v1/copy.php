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
$toFolder = app_sanitize_folder($data['toFolder'] ?? $fromFolder);
$name = app_sanitize_filename($data['name'] ?? $data['fileName'] ?? null);
$newName = isset($data['newName']) ? app_sanitize_filename($data['newName']) : $name;

if ($name === null || $newName === null) {
    app_json(['error' => 'Name required'], 400);
}

if (!empty($data['isFolder'])) {
    app_json(['error' => 'Folder copy is not supported'], 400);
}

if (!app_extension_allowed($newName)) {
    app_json([
        'error' => 'Invalid file type',
        'allowedExtensions' => app_allowed_extensions(),
    ], 400);
}

if (!app_folder_exists($fromFolder) || !app_folder_exists($toFolder)) {
    app_json(['error' => 'Folder not found'], 404);
}

$src = app_folder_path($fromFolder) . $name;
if (!is_file($src)) {
    app_json(['error' => 'File not found'], 404);
}

$size = (int) (@filesize($src) ?: 0);
$quota = app_storage_quota_bytes();
$used = app_dir_size(app_upload_dir());
if ($used + $size > $quota) {
    app_json([
        'error' => 'Storage quota exceeded',
        'usedBytes' => $used,
        'quotaBytes' => $quota,
    ], 413);
}

$dstDir = app_folder_path($toFolder);
app_ensure_dir($dstDir, 0755);
$dst = $dstDir . $newName;

if (file_exists($dst) && ($fromFolder !== $toFolder || $name !== $newName)) {
    // Auto-suffix for duplicate-in-place copies
    if (!empty($data['autoRename']) || ($fromFolder === $toFolder && $name === $newName)) {
        $base = pathinfo($newName, PATHINFO_FILENAME);
        $ext = pathinfo($newName, PATHINFO_EXTENSION);
        $n = 2;
        do {
            $candidate = $base . ' (' . $n . ')' . ($ext !== '' ? '.' . $ext : '');
            $safe = app_sanitize_filename($candidate);
            $n++;
        } while ($safe !== null && file_exists($dstDir . $safe) && $n < 100);
        if ($safe === null || file_exists($dstDir . $safe)) {
            app_json(['error' => 'Name already exists'], 409);
        }
        $newName = $safe;
        $dst = $dstDir . $newName;
    } else {
        app_json(['error' => 'Name already exists in destination'], 409);
    }
}

if (!@copy($src, $dst)) {
    app_json(['error' => 'Copy failed'], 500);
}

app_json([
    'message' => 'Copied successfully',
    'name' => $newName,
    'fromFolder' => $fromFolder,
    'toFolder' => $toFolder,
    'size' => $size,
]);
