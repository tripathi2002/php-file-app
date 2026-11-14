<?php
/**
 * CLI or authenticated personal admin: purge trash items older than N days.
 * Example: php api/v1/purge-expired-trash.php --days=7
 */
$root = dirname(__DIR__, 2);
require $root . '/helpers.php';

$days = 7;
$cli = PHP_SAPI === 'cli';

if ($cli) {
    global $argv;
    foreach ($argv ?? [] as $arg) {
        if (preg_match('/^--days=(\d+)$/', $arg, $m)) {
            $days = max(1, (int) $m[1]);
        }
    }
    $storageRoot = getenv('STORAGE_PATH');
    if (!is_string($storageRoot) || $storageRoot === '') {
        $storageRoot = $root . '/storage';
    }
    define('STORAGE_ROOT', rtrim($storageRoot, '/\\'));
} else {
    require $root . '/config.php';
    app_require_space();
    app_require_writable_space();
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    if (isset($data['days'])) {
        $days = max(1, (int) $data['days']);
    }
}

$cutoff = time() - ($days * 86400);
$removed = 0;

function purge_trash_dir(string $dir, int $cutoff, int &$removed): void
{
    if (!is_dir($dir)) {
        return;
    }
    foreach (scandir($dir) ?: [] as $name) {
        if ($name === '.' || $name === '..') {
            continue;
        }
        $path = $dir . '/' . $name;
        if (!is_file($path)) {
            continue;
        }
        $mtime = filemtime($path) ?: 0;
        if ($mtime > $cutoff) {
            continue;
        }
        if (@unlink($path)) {
            $removed++;
            if (PHP_SAPI === 'cli') {
                echo "Removed $path\n";
            }
        }
    }
}

if ($cli) {
    purge_trash_dir(STORAGE_ROOT . '/public/files/.trash', $cutoff, $removed);
    $users = STORAGE_ROOT . '/users';
    if (is_dir($users)) {
        foreach (scandir($users) ?: [] as $uid) {
            if ($uid === '.' || $uid === '..') {
                continue;
            }
            purge_trash_dir($users . '/' . $uid . '/files/.trash', $cutoff, $removed);
        }
    }
    echo "Purged $removed trash file(s) older than {$days}d.\n";
    exit(0);
}

purge_trash_dir(rtrim(app_upload_dir(), '/\\') . '/.trash', $cutoff, $removed);
app_json(['message' => 'Trash purged', 'removed' => $removed, 'days' => $days]);
