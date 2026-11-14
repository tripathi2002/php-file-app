<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();

header('Cache-Control: no-store');

$base = rtrim(app_upload_dir(), '/\\');
$rootReal = realpath($base);
if ($rootReal === false) {
    app_json(['error' => 'Storage missing'], 500);
}

$stats = [];
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
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION) ?: '(none)');
    if (!isset($stats[$ext])) {
        $stats[$ext] = ['ext' => $ext, 'count' => 0, 'bytes' => 0];
    }
    $stats[$ext]['count']++;
    $stats[$ext]['bytes'] += $item->getSize();
}

$list = array_values($stats);
usort($list, static fn($a, $b) => $b['bytes'] <=> $a['bytes']);

app_json([
    'space' => app_is_public_space() ? 'public' : 'personal',
    'extensions' => array_slice($list, 0, 40),
]);
