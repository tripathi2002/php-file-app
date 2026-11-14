<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();

header('Cache-Control: no-store');

function app_count_tree(string $dir): array
{
    $files = 0;
    $folders = 0;
    $bytes = 0;
    if (!is_dir($dir)) {
        return compact('files', 'folders', 'bytes');
    }
    $it = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    foreach ($it as $item) {
        $name = $item->getFilename();
        if ($name === '.gitkeep' || $name === '.htaccess' || str_starts_with($name, '.')) {
            continue;
        }
        if ($item->isDir()) {
            $folders++;
        } elseif ($item->isFile()) {
            $files++;
            $bytes += $item->getSize();
        }
    }
    return compact('files', 'folders', 'bytes');
}

$rootDir = rtrim(app_upload_dir(), '/\\');
$counts = app_count_tree($rootDir);
$quota = app_storage_quota_bytes();

app_json([
    'space' => app_is_public_space() ? 'public' : 'personal',
    'readOnly' => app_is_public_space() && app_public_readonly(),
    'files' => $counts['files'],
    'folders' => $counts['folders'],
    'usedBytes' => $counts['bytes'],
    'quotaBytes' => $quota,
    'remainingBytes' => max(0, $quota - $counts['bytes']),
    'usedHuman' => round($counts['bytes'] / (1024 * 1024), 2) . ' MB',
]);
