<?php
/** Create or update a README.txt in the current folder. */
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();
app_require_writable_space();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    app_json(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$folder = app_sanitize_folder($data['folder'] ?? '');
$default = "Folder notes\n============\nCreated " . gmdate('c') . "\nSpace: " . (app_is_public_space() ? 'public' : 'personal') . "\n";
$content = isset($data['content']) && is_string($data['content']) ? $data['content'] : $default;

if (strlen($content) > 512 * 1024) {
    app_json(['error' => 'Too large'], 413);
}

if ($folder !== '' && !app_folder_exists($folder)) {
    app_json(['error' => 'Folder not found'], 404);
}

$path = app_folder_path($folder) . 'README.txt';
if (@file_put_contents($path, $content) === false) {
    app_json(['error' => 'Write failed'], 500);
}

app_json(['message' => 'README.txt saved', 'folder' => $folder, 'name' => 'README.txt']);
