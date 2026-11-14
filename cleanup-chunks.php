<?php
/**
 * CLI cron: delete abandoned chunk sessions older than N hours.
 * Cleans legacy storage/chunks, public chunks, and each user's chunks.
 * Example: php cleanup-chunks.php --hours=12
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

$hours = 24;
foreach ($argv as $arg) {
    if (preg_match('/^--hours=(\d+)$/', $arg, $m)) {
        $hours = max(1, (int) $m[1]);
    }
}

require_once __DIR__ . '/helpers.php';

$storageRoot = getenv('STORAGE_PATH');
if (!is_string($storageRoot) || $storageRoot === '') {
    $storageRoot = __DIR__ . '/storage';
}
$storageRoot = rtrim($storageRoot, '/\\');
$cutoff = time() - ($hours * 3600);
$removed = 0;

function cleanup_chunk_tree(string $chunkDir, int $cutoff, int &$removed): void
{
    if (!is_dir($chunkDir)) {
        return;
    }
    foreach (scandir($chunkDir) ?: [] as $name) {
        if ($name === '.' || $name === '..' || $name === '.gitkeep' || $name === '.htaccess') {
            continue;
        }
        $path = $chunkDir . '/' . $name;
        if (!is_dir($path)) {
            continue;
        }
        $mtime = filemtime($path) ?: 0;
        if ($mtime > $cutoff) {
            continue;
        }
        foreach (glob($path . '/chunk_*') ?: [] as $file) {
            @unlink($file);
        }
        @unlink($path . '/meta.json');
        if (@rmdir($path)) {
            $removed++;
            echo "Removed $path\n";
        }
    }
}

$dirs = [
    $storageRoot . '/chunks',
    $storageRoot . '/public/chunks',
];

$usersDir = $storageRoot . '/users';
if (is_dir($usersDir)) {
    foreach (scandir($usersDir) ?: [] as $uid) {
        if ($uid === '.' || $uid === '..') {
            continue;
        }
        $dirs[] = $usersDir . '/' . $uid . '/chunks';
    }
}

foreach ($dirs as $dir) {
    cleanup_chunk_tree($dir, $cutoff, $removed);
}

echo "Done. Removed $removed session(s) older than {$hours}h.\n";
