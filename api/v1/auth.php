<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';
require $root . '/rate-limit.php';

header('Cache-Control: no-store');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$data = [];
if (in_array($method, ['POST', 'PUT', 'DELETE'], true)) {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
}

$action = $data['action'] ?? ($_GET['action'] ?? '');

if ($method === 'GET' || $action === 'me') {
    $token = app_get_bearer_token();
    $session = app_load_session($token);
    if ($session === null) {
        app_json(['authenticated' => false, 'authRequired' => true], 200);
    }
    $user = app_load_user($session['userId']);
    if ($user === null) {
        app_destroy_session($token);
        app_json(['authenticated' => false, 'authRequired' => true], 200);
    }
    app_json([
        'authenticated' => true,
        'mobileMasked' => app_mask_mobile($user['mobile'] ?? ''),
        'userId' => $user['id'],
    ]);
}

if ($method !== 'POST') {
    app_json(['error' => 'Method not allowed'], 405);
}

if ($action === 'logout') {
    app_destroy_session(app_get_bearer_token());
    app_json(['message' => 'Logged out', 'authenticated' => false]);
}

checkRateLimit(10, 60);

$mobile = app_normalize_mobile($data['mobile'] ?? null);
$pin = app_normalize_pin($data['pin'] ?? null);

if ($mobile === null) {
    app_json(['error' => 'Enter a valid mobile number (10–15 digits)'], 400);
}
if ($pin === null) {
    app_json(['error' => 'PIN must be 4–6 digits'], 400);
}

$userId = app_user_id_from_mobile($mobile);
$existing = app_load_user($userId);

if ($action === 'register' || ($action === 'enter' && $existing === null)) {
    if ($existing !== null) {
        app_json(['error' => 'This mobile already has a space. Enter your PIN to open it.'], 409);
    }
    $user = [
        'id' => $userId,
        'mobile' => $mobile,
        'pinHash' => password_hash($pin, PASSWORD_DEFAULT),
        'created' => time(),
    ];
    app_save_user($user);
    $token = app_create_session($userId);
    app_json([
        'message' => 'Personal space created',
        'token' => $token,
        'mobileMasked' => app_mask_mobile($mobile),
        'isNew' => true,
    ]);
}

if ($action === 'login' || $action === 'enter') {
    if ($existing === null) {
        app_json([
            'error' => 'No personal space for this number yet',
            'needsRegister' => true,
        ], 404);
    }
    if (!password_verify($pin, $existing['pinHash'] ?? '')) {
        app_json(['error' => 'Wrong PIN'], 401);
    }
    $token = app_create_session($userId);
    app_json([
        'message' => 'Welcome back',
        'token' => $token,
        'mobileMasked' => app_mask_mobile($mobile),
        'isNew' => false,
    ]);
}

app_json(['error' => 'Unknown action. Use enter, register, login, logout, or me.'], 400);
