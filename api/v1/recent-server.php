<?php
/** Newest files across the whole space (server-side). */
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();

header('Cache-Control: no-store');

$limit = max(5, min(40, (int) ($_GET['limit'] ?? 12)));
$base = rtrim(app_upload_dir(), '/\\');
$rootReal = realpath($base);
if ($rootReal === false) {
    app_json(['error' => 'Storage missing'], 500);
}

$files = [];
$it = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($rootReal, FilesystemIterator::SKIP_DOTS)
);

foreach ($it as $item) {
    if (!$item->isFile()) {
        continue;
    }
    $name = $item->getFilename();
    if ($name === '.gitkeep' || $name === '.htaccess' || str_starts_with($name, '.')) {
        continue;
    }
    if (str_contains($item->getPath(), DIRECTORY_SEPARATOR . '.trash')) {
        continue;
    }
    $fullNorm = str_replace('\\', '/', $item->getPathname());
    $rootNorm = str_replace('\\', '/', $rootReal);
    $rel = ltrim(substr($fullNorm, strlen($rootNorm)), '/');
    $folder = str_contains($rel, '/') ? dirname($rel) : '';
    if ($folder === '.') {
        $folder = '';
    }
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $mime = @mime_content_type($item->getPathname()) ?: 'application/octet-stream';
    $files[] = [
        'name' => $name,
        'folder' => $folder,
        'path' => $rel,
        'size' => $item->getSize(),
        'mtime' => $item->getMTime(),
        'ext' => $ext,
        'mime' => $mime,
        'viewUrl' => app_signed_download_url($name, true, 3600, $folder),
        'downloadUrl' => app_signed_download_url($name, false, 3600, $folder),
    ];
}

usort($files, static fn($a, $b) => $b['mtime'] <=> $a['mtime']);

app_json([
    'space' => app_is_public_space() ? 'public' : 'personal',
    'items' => array_slice($files, 0, $limit),
]);
