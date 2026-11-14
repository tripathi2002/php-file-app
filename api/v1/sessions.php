<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';
require_once $root . '/auth.php';

app_require_auth();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$user = app_current_user();
$currentToken = app_get_bearer_token();

if ($method === 'GET') {
    $list = [];
    foreach (glob(app_sessions_dir() . '/*.json') ?: [] as $file) {
        $data = json_decode((string) file_get_contents($file), true);
        if (!is_array($data) || ($data['userId'] ?? '') !== ($user['id'] ?? '')) {
            continue;
        }
        if (($data['expires'] ?? 0) < time()) {
            continue;
        }
        $token = $data['token'] ?? basename($file, '.json');
        $list[] = [
            'tokenPrefix' => substr($token, 0, 8),
            'created' => $data['created'] ?? null,
            'expires' => $data['expires'] ?? null,
            'current' => hash_equals((string) $currentToken, (string) $token),
        ];
    }
    usort($list, static fn($a, $b) => ($b['created'] ?? 0) <=> ($a['created'] ?? 0));
    app_json(['sessions' => $list, 'count' => count($list)]);
}

if ($method === 'POST' || $method === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $data['action'] ?? 'revokeOthers';
    $removed = 0;

    if ($action === 'revokeOthers') {
        foreach (glob(app_sessions_dir() . '/*.json') ?: [] as $file) {
            $sess = json_decode((string) file_get_contents($file), true);
            if (!is_array($sess) || ($sess['userId'] ?? '') !== ($user['id'] ?? '')) {
                continue;
            }
            $token = $sess['token'] ?? basename($file, '.json');
            if (hash_equals((string) $currentToken, (string) $token)) {
                continue;
            }
            @unlink($file);
            $removed++;
        }
        app_json(['message' => 'Other sessions revoked', 'removed' => $removed]);
    }

    app_json(['error' => 'Unknown action'], 400);
}

app_json(['error' => 'Method not allowed'], 405);
