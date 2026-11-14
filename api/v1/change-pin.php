<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';
require_once $root . '/auth.php';
require $root . '/rate-limit.php';

app_require_auth();
checkRateLimit(10, 60);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    app_json(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$current = app_normalize_pin($data['currentPin'] ?? $data['oldPin'] ?? null);
$next = app_normalize_pin($data['newPin'] ?? null);

$user = app_current_user();
if ($user === null) {
    app_json(['error' => 'Unauthorized', 'authRequired' => true], 401);
}

if ($current === null || $next === null) {
    app_json(['error' => 'PIN must be 4–6 digits'], 400);
}

if (!password_verify($current, $user['pinHash'] ?? '')) {
    app_json(['error' => 'Current PIN is wrong'], 403);
}

if ($current === $next) {
    app_json(['error' => 'New PIN must be different'], 400);
}

$user['pinHash'] = password_hash($next, PASSWORD_DEFAULT);
$user['updatedAt'] = gmdate('c');
app_save_user($user);
app_set_current_user($user);

app_json(['message' => 'PIN updated']);
