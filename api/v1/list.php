<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_auth();

header('Cache-Control: no-store');

$entries = scandir(UPLOAD_DIR);
if ($entries === false) {
    app_json(['error' => 'Cannot read uploads'], 500);
}

$files = [];
foreach ($entries as $name) {
    if ($name === '.' || $name === '..' || $name === '.gitkeep' || $name === '.htaccess' || $name[0] === '.') {
        continue;
    }
    $path = UPLOAD_DIR . $name;
    if (!is_file($path)) {
        continue;
    }
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $mime = mime_content_type($path) ?: 'application/octet-stream';
    $mtime = filemtime($path) ?: time();
    $size = filesize($path) ?: 0;

    $files[] = [
        'name' => $name,
        'size' => $size,
        'mtime' => $mtime,
        'mtimeIso' => gmdate('c', $mtime),
        'ext' => $ext,
        'mime' => $mime,
        'viewUrl' => app_signed_download_url($name, true, 300),
        'downloadUrl' => app_signed_download_url($name, false, 300),
        'thumbUrl' => str_starts_with($mime, 'image/')
            ? app_signed_download_url($name, true, 300)
            : null,
    ];
}

usort($files, static fn($a, $b) => $b['mtime'] <=> $a['mtime']);

$used = app_dir_size(UPLOAD_DIR);
$quota = app_storage_quota_bytes();

app_json([
    'files' => $files,
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
