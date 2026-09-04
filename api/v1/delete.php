<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];

$fileName = $data['fileName'] ?? ($_GET['file'] ?? null);

if (!$fileName) {
    http_response_code(400);
    echo json_encode(['error' => 'File name required']);
    exit;
}

$fileName = basename($fileName);
$filePath = UPLOAD_DIR . $fileName;

if (!file_exists($filePath)) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found']);
    exit;
}

if (unlink($filePath)) {
    echo json_encode([
        'message' => 'File deleted successfully',
        'file' => $fileName,
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Delete failed']);
}
