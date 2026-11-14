<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();

header('Cache-Control: no-store');

$limit = max(5, min(50, (int) ($_GET['limit'] ?? 20)));
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
    if ($name === '.gitkeep' || $name === '.htaccess' || str_starts_with($name, '.') || str_contains($item->getPath(), DIRECTORY_SEPARATOR . '.trash')) {
        continue;
    }
    $fullNorm = str_replace('\\', '/', $item->getPathname());
    $rootNorm = str_replace('\\', '/', $rootReal);
    $rel = ltrim(substr($fullNorm, strlen($rootNorm)), '/');
    $folder = str_contains($rel, '/') ? dirname($rel) : '';
    $files[] = [
        'name' => $name,
        'folder' => $folder === '.' ? '' : $folder,
        'path' => $rel,
        'size' => $item->getSize(),
        'mtime' => $item->getMTime(),
    ];
}

usort($files, static fn($a, $b) => $b['size'] <=> $a['size']);
$top = array_slice($files, 0, $limit);
$total = array_sum(array_column($files, 'size'));

app_json([
    'space' => app_is_public_space() ? 'public' : 'personal',
    'totalFiles' => count($files),
    'totalBytes' => $total,
    'items' => $top,
]);
