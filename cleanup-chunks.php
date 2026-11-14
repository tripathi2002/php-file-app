<?php
/**
 * CLI cron: delete abandoned chunk sessions older than N hours.
 * Example (Hostinger cron): php /home/USER/public_html/file-app/cleanup-chunks.php
 * Optional: php cleanup-chunks.php --hours=12
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

$root = __DIR__;
$chunkDir = $root . '/chunks';
$cutoff = time() - ($hours * 3600);
$removed = 0;

if (!is_dir($chunkDir)) {
    echo "No chunks directory.\n";
    exit(0);
}

foreach (scandir($chunkDir) ?: [] as $name) {
    if ($name === '.' || $name === '..' || $name === '.gitkeep') {
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
    if (@rmdir($path)) {
        $removed++;
        echo "Removed $name\n";
    }
}

echo "Done. Removed $removed session(s) older than {$hours}h.\n";
