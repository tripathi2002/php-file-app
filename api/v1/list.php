<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();

header('Cache-Control: no-store');

$folder = app_sanitize_folder($_GET['folder'] ?? '');
$dir = app_folder_path($folder);
app_ensure_dir($dir, 0755);

$entries = scandir($dir);
if ($entries === false) {
    app_json(['error' => 'Cannot read folder'], 500);
}

$folders = [];
$files = [];

foreach ($entries as $name) {
    if ($name === '.' || $name === '..' || $name === '.gitkeep' || $name === '.htaccess' || $name[0] === '.' || $name === '.trash') {
        continue;
    }
    $path = $dir . $name;
    if (is_dir($path)) {
        $folders[] = [
            'name' => $name,
            'type' => 'folder',
            'path' => $folder === '' ? $name : $folder . '/' . $name,
            'mtime' => @filemtime($path) ?: time(),
        ];
        continue;
    }
    if (!is_file($path)) {
        continue;
    }
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $mime = @mime_content_type($path) ?: 'application/octet-stream';
    $mtime = @filemtime($path) ?: time();
    $size = @filesize($path) ?: 0;

    $files[] = [
        'name' => $name,
        'type' => 'file',
        'size' => $size,
        'mtime' => $mtime,
        'mtimeIso' => gmdate('c', $mtime),
        'ext' => $ext,
        'mime' => $mime,
        'folder' => $folder,
        'viewUrl' => app_signed_download_url($name, true, 3600, $folder),
        'downloadUrl' => app_signed_download_url($name, false, 3600, $folder),
        'thumbUrl' => str_starts_with($mime, 'image/')
            ? app_signed_download_url($name, true, 3600, $folder)
            : null,
    ];
}

usort($folders, static fn($a, $b) => strcasecmp($a['name'], $b['name']));
usort($files, static fn($a, $b) => $b['mtime'] <=> $a['mtime']);

$used = app_dir_size(app_upload_dir());
$quota = app_storage_quota_bytes();
$user = app_current_user();

app_json([
    'space' => app_is_public_space() ? 'public' : 'personal',
    'readOnly' => app_is_public_space() && app_public_readonly(),
    'folder' => $folder,
    'folders' => $folders,
    'files' => $files,
    'items' => array_merge($folders, $files),
    'mobileMasked' => $user ? app_mask_mobile($user['mobile'] ?? '') : null,
    'allowedExtensions' => app_allowed_extensions(),
    'accept' => app_accept_attribute(),
    'limits' => [
        'maxUploadBytes' => app_max_upload_bytes(),
        'maxUploadMB' => round(app_max_upload_bytes() / (1024 * 1024), 1),
        'quotaBytes' => $quota,
        'usedBytes' => $used,
        'remainingBytes' => max(0, $quota - $used),
    ],
]);
