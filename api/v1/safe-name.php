<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();

header('Cache-Control: no-store');

$raw = (string) ($_GET['name'] ?? '');
$folder = app_sanitize_folder($_GET['folder'] ?? '');
$safe = app_sanitize_filename($raw);

if ($safe === null) {
    app_json(['ok' => false, 'error' => 'Invalid name', 'suggested' => null]);
}

$path = app_folder_path($folder) . $safe;
if (!file_exists($path)) {
    app_json(['ok' => true, 'available' => true, 'name' => $safe]);
}

$base = pathinfo($safe, PATHINFO_FILENAME);
$ext = pathinfo($safe, PATHINFO_EXTENSION);
$n = 2;
$candidate = null;
do {
    $try = $base . ' (' . $n . ')' . ($ext !== '' ? '.' . $ext : '');
    $candidate = app_sanitize_filename($try);
    $n++;
} while ($candidate !== null && file_exists(app_folder_path($folder) . $candidate) && $n < 100);

app_json([
    'ok' => true,
    'available' => false,
    'name' => $safe,
    'suggested' => $candidate,
]);
