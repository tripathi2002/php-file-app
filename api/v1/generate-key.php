<?php
// CLI-only: run `php generate-key.php` (or `php api/v1/generate-key.php`) to issue an access key.
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

$root = dirname(__DIR__, 2);
require_once $root . '/helpers.php';

$days = 30;
foreach ($argv ?? [] as $arg) {
    if (preg_match('/^--days=(\d+)$/', $arg, $m)) {
        $days = max(1, min(365, (int) $m[1]));
    }
}

app_ensure_dir($root . '/tokens', 0755);

$token = bin2hex(random_bytes(16));
$expires = time() + ($days * 86400);

file_put_contents(
    $root . '/tokens/' . $token . '.json',
    json_encode([
        'token' => $token,
        'expires' => $expires,
        'created' => time(),
    ], JSON_PRETTY_PRINT)
);

echo json_encode([
    'accessKey' => $token,
    'expiresIn' => $days . ' days',
    'expiresAt' => gmdate('c', $expires),
    'hint' => 'Paste this key in the File Upload UI (lock icon). Auth auto-enables once a key exists.',
], JSON_PRETTY_PRINT) . PHP_EOL;
