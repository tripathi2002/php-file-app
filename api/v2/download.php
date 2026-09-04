<?php
$root = dirname(__DIR__, 2);
require __DIR__ . '/bootstrap.php';
require $root . '/config.php';

if (!isset($_GET['file'])) {
    die('File not specified');
}

$fileName = basename($_GET['file']);
$filePath = UPLOAD_DIR . $fileName;

if (!file_exists($filePath)) {
    die('File not found');
}

header('Content-Description: File Transfer');
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . $fileName . '"');
header('Content-Length: ' . filesize($filePath));

readfile($filePath);
exit;
