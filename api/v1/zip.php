<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();


if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    app_json(['error' => 'Method not allowed'], 405);
}

if (!class_exists('ZipArchive')) {
    app_json(['error' => 'ZIP not available on this server'], 501);
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$folder = app_sanitize_folder($data['folder'] ?? '');
$names = $data['names'] ?? $data['files'] ?? [];

if (!is_array($names) || count($names) === 0) {
    app_json(['error' => 'No files selected'], 400);
}
if (count($names) > 30) {
    app_json(['error' => 'Select at most 30 files'], 400);
}
if (!app_folder_exists($folder)) {
    app_json(['error' => 'Folder not found'], 404);
}

$tmp = tempnam(sys_get_temp_dir(), 'fzip');
if ($tmp === false) {
    app_json(['error' => 'Could not create temp file'], 500);
}
@unlink($tmp);
$tmp .= '.zip';

$zip = new ZipArchive();
if ($zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    app_json(['error' => 'Could not create zip'], 500);
}

$added = 0;
foreach ($names as $raw) {
    $name = app_sanitize_filename(is_string($raw) ? $raw : null);
    if ($name === null) {
        continue;
    }
    $path = app_folder_path($folder) . $name;
    if (!is_file($path)) {
        continue;
    }
    $zip->addFile($path, $name);
    $added++;
}
$zip->close();

if ($added === 0 || !is_file($tmp)) {
    @unlink($tmp);
    app_json(['error' => 'No valid files to zip'], 400);
}

$downloadName = 'files-' . gmdate('Ymd-His') . '.zip';
header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . $downloadName . '"');
header('Content-Length: ' . filesize($tmp));
header('Cache-Control: private, no-store');
readfile($tmp);
@unlink($tmp);
exit;
