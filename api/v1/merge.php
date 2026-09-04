<?php
// v1 merge contract — do not change request/response shape here.
// Breaking merge changes belong in api/v2/merge.php.
$root = dirname(__DIR__, 2);
require $root . '/config.php';
require $root . '/rate-limit.php';
require $root . '/throttle.php';

applyThrottle(500);
checkRateLimit(2, 1);

$data = json_decode(file_get_contents('php://input'), true) ?? [];

$fileName = $data['fileName'] ?? null;
$totalChunks = $data['totalChunks'] ?? null;

if (!$fileName || !$totalChunks) {
    echo json_encode([
        'error' => 'Invalid request',
        'received' => $data,
    ]);
    exit;
}

$fileKey = md5($fileName);
$chunkPath = CHUNK_DIR . $fileKey;
$finalPath = UPLOAD_DIR . basename($fileName);

$out = fopen($finalPath, 'wb');

for ($i = 0; $i < $totalChunks; $i++) {
    $chunkFile = "$chunkPath/chunk_$i";

    if (!file_exists($chunkFile)) {
        fclose($out);
        echo json_encode(['error' => "Missing chunk $i"]);
        exit;
    }

    $in = fopen($chunkFile, 'rb');
    while ($buff = fread($in, 4096)) {
        fwrite($out, $buff);
    }
    fclose($in);
}

fclose($out);

array_map('unlink', glob("$chunkPath/chunk_*"));
rmdir($chunkPath);

echo json_encode([
    'message' => 'File merged successfully',
    'file' => $fileName,
]);
