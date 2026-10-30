<?php
// CLI-only: run `php generate-key.php` on the server to issue an access key.
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Forbidden']);
    exit;
}
$root = dirname(__DIR__, 2);

$token = bin2hex(random_bytes(16));

$data = [
    'token' => $token,
    'expires' => time() + 3600,
];

file_put_contents($root . '/tokens/' . $token . '.json', json_encode($data));

echo json_encode([
    'accessKey' => $token,
    'expiresIn' => '1 hour',
]) . PHP_EOL;
