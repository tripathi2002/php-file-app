<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();

header('Cache-Control: no-store');

function app_collect_folders(string $baseDir, string $prefix = '', int $depth = 0): array
{
    $out = [];
    if ($depth > 5 || !is_dir($baseDir)) {
        return $out;
    }
    $entries = scandir($baseDir) ?: [];
    sort($entries, SORT_NATURAL | SORT_FLAG_CASE);
    foreach ($entries as $name) {
        if ($name === '.' || $name === '..' || $name === '.gitkeep' || $name === '.htaccess' || ($name[0] ?? '') === '.') {
            continue;
        }
        $path = $baseDir . '/' . $name;
        if (!is_dir($path)) {
            continue;
        }
        $rel = $prefix === '' ? $name : $prefix . '/' . $name;
        $out[] = [
            'path' => $rel,
            'name' => $name,
            'depth' => $depth + 1,
        ];
        $out = array_merge($out, app_collect_folders($path, $rel, $depth + 1));
    }
    return $out;
}

$rootPath = rtrim(app_upload_dir(), '/\\');
app_ensure_dir($rootPath, 0755);

app_json([
    'space' => app_is_public_space() ? 'public' : 'personal',
    'folders' => array_merge(
        [['path' => '', 'name' => '(root)', 'depth' => 0]],
        app_collect_folders($rootPath)
    ),
]);
