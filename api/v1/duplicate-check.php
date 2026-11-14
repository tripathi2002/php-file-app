<?php
/** Find duplicate filenames (same basename) across the space. */
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();

header('Cache-Control: no-store');

$base = rtrim(app_upload_dir(), '/\\');
$rootReal = realpath($base);
if ($rootReal === false) {
    app_json(['error' => 'Storage missing'], 500);
}

$map = [];
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
    $key = strtolower($name);
    $fullNorm = str_replace('\\', '/', $item->getPathname());
    $rootNorm = str_replace('\\', '/', $rootReal);
    $rel = ltrim(substr($fullNorm, strlen($rootNorm)), '/');
    $folder = str_contains($rel, '/') ? dirname($rel) : '';
    if ($folder === '.') {
        $folder = '';
    }
    $map[$key][] = [
        'name' => $name,
        'folder' => $folder,
        'path' => $rel,
        'size' => $item->getSize(),
        'mtime' => $item->getMTime(),
    ];
}

$dupes = [];
foreach ($map as $key => $items) {
    if (count($items) < 2) {
        continue;
    }
    $dupes[] = [
        'name' => $items[0]['name'],
        'count' => count($items),
        'locations' => $items,
    ];
}

usort($dupes, static fn($a, $b) => $b['count'] <=> $a['count']);

app_json([
    'space' => app_is_public_space() ? 'public' : 'personal',
    'groups' => array_slice($dupes, 0, 50),
    'groupCount' => count($dupes),
]);
