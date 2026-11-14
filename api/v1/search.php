<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();

header('Cache-Control: no-store');

$q = trim((string) ($_GET['q'] ?? ''));
if ($q === '' || strlen($q) < 2) {
    app_json(['error' => 'Query too short (min 2 chars)'], 400);
}
if (strlen($q) > 80) {
    app_json(['error' => 'Query too long'], 400);
}

$needle = strtolower($q);
$base = rtrim(app_upload_dir(), '/\\');
$rootReal = realpath($base);
if ($rootReal === false) {
    app_json(['error' => 'Storage missing'], 500);
}

$results = [];
$max = 100;

$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($rootReal, FilesystemIterator::SKIP_DOTS),
    RecursiveIteratorIterator::SELF_FIRST
);

foreach ($iterator as $item) {
    if (count($results) >= $max) {
        break;
    }
    $name = $item->getFilename();
    if ($name === '.gitkeep' || $name === '.htaccess' || $name === '.trash' || str_starts_with($name, '.')) {
        continue;
    }
    if (strpos(strtolower($name), $needle) === false) {
        continue;
    }

    $full = $item->getPathname();
    $fullNorm = str_replace('\\', '/', $full);
    $rootNorm = str_replace('\\', '/', $rootReal);
    $rel = ltrim(substr($fullNorm, strlen($rootNorm)), '/');

    if ($item->isDir()) {
        $parent = str_contains($rel, '/') ? dirname($rel) : '';
        if ($parent === '.') {
            $parent = '';
        }
        $results[] = [
            'type' => 'folder',
            'name' => $name,
            'path' => $rel,
            'folder' => $parent,
            'mtime' => $item->getMTime(),
        ];
        continue;
    }

    if (!$item->isFile()) {
        continue;
    }

    $fileFolder = str_contains($rel, '/') ? dirname($rel) : '';
    if ($fileFolder === '.') {
        $fileFolder = '';
    }
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $mime = @mime_content_type($full) ?: 'application/octet-stream';
    $results[] = [
        'type' => 'file',
        'name' => $name,
        'folder' => $fileFolder,
        'path' => $rel,
        'size' => $item->getSize(),
        'mtime' => $item->getMTime(),
        'ext' => $ext,
        'mime' => $mime,
        'viewUrl' => app_signed_download_url($name, true, 3600, $fileFolder),
        'downloadUrl' => app_signed_download_url($name, false, 3600, $fileFolder),
    ];
}

app_json([
    'space' => app_is_public_space() ? 'public' : 'personal',
    'q' => $q,
    'count' => count($results),
    'truncated' => count($results) >= $max,
    'results' => $results,
]);
