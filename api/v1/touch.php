<?php
/** Update mtime of a file (bump "recent" without rewriting). */
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();
app_require_writable_space();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    app_json(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$folder = app_sanitize_folder($data['folder'] ?? '');
$name = app_sanitize_filename($data['name'] ?? $data['fileName'] ?? null);

if ($name === null) {
    app_json(['error' => 'Name required'], 400);
}

$path = app_folder_path($folder) . $name;
if (!is_file($path)) {
    app_json(['error' => 'File not found'], 404);
}

$now = time();
if (!@touch($path, $now)) {
    app_json(['error' => 'Touch failed'], 500);
}

app_json(['message' => 'Updated', 'name' => $name, 'mtime' => $now]);
