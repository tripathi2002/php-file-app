<?php
require 'config.php';

// Allow both JSON and query param
$data = json_decode(file_get_contents("php://input"), true);

$fileName = $data['fileName'] ?? ($_GET['file'] ?? null);

if (!$fileName) {
    http_response_code(400);
    echo json_encode(['error' => 'File name required']);
    exit;
}

// sanitize
$fileName = basename($fileName);
$filePath = UPLOAD_DIR . $fileName;

if (!file_exists($filePath)) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found']);
    exit;
}

// delete file
if (unlink($filePath)) {
    echo json_encode([
        'message' => 'File deleted successfully',
        'file' => $fileName
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Delete failed']);
}