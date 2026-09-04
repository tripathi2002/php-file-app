<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';
require $root . '/rate-limit.php';
require $root . '/throttle.php';

applyThrottle(200);
checkRateLimit(5, 1);

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

$allowed = ['jpg', 'png', 'pdf', 'mp4', 'zip', 'txt'];
if (!in_array(strtolower($ext), $allowed)) {
    echo json_encode(['error' => 'Invalid file type']);
    exit;
}

$fileKey = md5($fileName);
$chunkPath = CHUNK_DIR . $fileKey;

if (!file_exists($chunkPath)) {
    mkdir($chunkPath, 0777, true);
}

move_uploaded_file(
    $file['tmp_name'],
    "$chunkPath/chunk_$chunkIndex"
);

echo json_encode([
    'message' => "Chunk $chunkIndex uploaded",
]);
