<?php

/**
 * Personal-space auth: mobile number + PIN → session token.
 * No CLI access keys required for normal use.
 */

function app_users_dir(): string
{
    return STORAGE_ROOT . '/users';
}

function app_sessions_dir(): string
{
    return STORAGE_ROOT . '/sessions';
}

function app_normalize_mobile(?string $mobile): ?string
{
    if ($mobile === null) {
        return null;
    }
    $digits = preg_replace('/\D+/', '', $mobile) ?? '';
    // Allow 10–15 digits (local or with country code)
    if (!preg_match('/^\d{10,15}$/', $digits)) {
        return null;
    }
    return $digits;
}

function app_normalize_pin(?string $pin): ?string
{
    if ($pin === null) {
        return null;
    }
    $pin = trim($pin);
    if (!preg_match('/^\d{4,6}$/', $pin)) {
        return null;
    }
    return $pin;
}

function app_user_id_from_mobile(string $mobile): string
{
    return hash('sha256', 'file-app-user|' . $mobile);
}

function app_user_dir(string $userId): string
{
    return app_users_dir() . '/' . $userId;
}

function app_user_profile_path(string $userId): string
{
    return app_user_dir($userId) . '/profile.json';
}

function app_load_user(string $userId): ?array
{
    $path = app_user_profile_path($userId);
    if (!is_file($path)) {
        return null;
    }
    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : null;
}

function app_save_user(array $user): void
{
    $dir = app_user_dir($user['id']);
    app_ensure_dir($dir, 0755);
    app_ensure_dir($dir . '/files', 0755);
    app_ensure_dir($dir . '/chunks', 0755);
    file_put_contents(
        app_user_profile_path($user['id']),
        json_encode($user, JSON_PRETTY_PRINT)
    );
}

function app_create_session(string $userId): string
{
    app_ensure_dir(app_sessions_dir(), 0755);
    $token = bin2hex(random_bytes(24));
    $payload = [
        'token' => $token,
        'userId' => $userId,
        'created' => time(),
        'expires' => time() + (60 * 60 * 24 * 30), // 30 days
    ];
    file_put_contents(
        app_sessions_dir() . '/' . $token . '.json',
        json_encode($payload)
    );
    return $token;
}

function app_load_session(?string $token): ?array
{
    if ($token === null || !preg_match('/^[a-f0-9]{32,96}$/i', $token)) {
        return null;
    }
    $path = app_sessions_dir() . '/' . strtolower($token) . '.json';
    if (!is_file($path)) {
        return null;
    }
    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data) || empty($data['userId']) || empty($data['expires'])) {
        return null;
    }
    if ((int) $data['expires'] < time()) {
        @unlink($path);
        return null;
    }
    return $data;
}

function app_destroy_session(?string $token): void
{
    if ($token === null || !preg_match('/^[a-f0-9]{32,96}$/i', $token)) {
        return;
    }
    $path = app_sessions_dir() . '/' . strtolower($token) . '.json';
    if (is_file($path)) {
        @unlink($path);
    }
}

function app_current_user(): ?array
{
    return $GLOBALS['APP_CURRENT_USER'] ?? null;
}

function app_set_current_user(?array $user): void
{
    $GLOBALS['APP_CURRENT_USER'] = $user;
}

/** @deprecated kept for any leftover key files — prefer session auth */
function validateToken($token)
{
    $session = app_load_session($token);
    return $session !== null;
}

function app_mask_mobile(string $mobile): string
{
    $len = strlen($mobile);
    if ($len < 4) {
        return '****';
    }
    return str_repeat('*', max(0, $len - 4)) . substr($mobile, -4);
}
