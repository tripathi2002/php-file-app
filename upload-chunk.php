<?php
require 'config.php';
require 'rate-limit.php';
require 'throttle.php';

applyThrottle(200); // 200ms gap between requests
checkRateLimit(5, 1); // 5 req/sec

$chunkIndex = $_POST['chunkIndex'] ?? null;
$totalChunks = $_POST['totalChunks'] ?? null;
$fileName = $_POST['fileName'] ?? null;

if (!isset($_FILES['file']) || $chunkIndex === null || !$fileName) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
    exit;
}

$file = $_FILES['file'];
$ext = pathinfo($fileName, PATHINFO_EXTENSION);

// basic validation
$allowed = ['jpg', 'png', 'pdf', 'mp4', 'zip', 'txt'];
if (!in_array(strtolower($ext), $allowed)) {
    echo json_encode(['error' => 'Invalid file type']);
    exit;
}

// unique folder per file
$fileKey = md5($fileName);
$chunkPath = CHUNK_DIR . $fileKey;

if (!file_exists($chunkPath)) {
    mkdir($chunkPath, 0777, true);
}

// store chunk
move_uploaded_file(
    $file['tmp_name'],
    "$chunkPath/chunk_$chunkIndex"
);

echo json_encode([
    'message' => "Chunk $chunkIndex uploaded"
]);