<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_auth();

$entries = scandir(UPLOAD_DIR);
if ($entries === false) {
    app_json(['error' => 'Cannot read uploads'], 500);
}

$files = [];
foreach ($entries as $name) {
    if ($name === '.' || $name === '..' || $name === '.gitkeep' || $name[0] === '.') {
        continue;
    }
    $path = UPLOAD_DIR . $name;
    if (!is_file($path)) {
        continue;
    }
    $files[] = $name;
}

sort($files, SORT_NATURAL | SORT_FLAG_CASE);
app_json($files);
