<?php

function app_allowed_extensions(): array
{
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'mp4', 'webm', 'zip', 'txt', 'csv', 'json', 'doc', 'docx', 'xls', 'xlsx'];
}

function app_json_headers(): void
{
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
    }
}

function app_json(array $payload, int $status = 200): void
{
    app_json_headers();
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function app_ensure_dir(string $dir, int $mode = 0755): void
{
    if (!is_dir($dir)) {
        mkdir($dir, $mode, true);
    }
}

function app_sanitize_filename(?string $name): ?string
{
    if ($name === null || $name === '') {
        return null;
    }
    $name = basename(str_replace(["\0", '\\'], '', $name));
    $name = preg_replace('/[^\w.\- ()[\]]+/u', '_', $name) ?? '';
    $name = trim($name, " .");
    if ($name === '' || $name === '.' || $name === '..') {
        return null;
    }
    return $name;
}

function app_extension_allowed(string $fileName): bool
{
    $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    return $ext !== '' && in_array($ext, app_allowed_extensions(), true);
}

function app_sanitize_chunk_index($value): ?int
{
    if ($value === null || $value === '') {
        return null;
    }
    if (!is_numeric($value)) {
        return null;
    }
    $index = (int) $value;
    if ((string) $index !== (string) (int) $value && (float) $value != $index) {
        return null;
    }
    if ($index < 0 || $index > 100000) {
        return null;
    }
    return $index;
}

function app_sanitize_upload_id(?string $uploadId): ?string
{
    if ($uploadId === null || $uploadId === '') {
        return null;
    }
    if (!preg_match('/^[a-f0-9]{16,64}$/i', $uploadId)) {
        return null;
    }
    return strtolower($uploadId);
}

/** Chunk folder key: prefer uploadId, else md5(fileName) for legacy clients. */
function app_chunk_key(?string $uploadId, string $fileName): string
{
    $safeId = app_sanitize_upload_id($uploadId);
    if ($safeId !== null) {
        return $safeId;
    }
    return md5($fileName);
}

function app_get_bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';
    if ($header === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        foreach ($headers as $key => $value) {
            if (strtolower($key) === 'authorization') {
                $header = $value;
                break;
            }
        }
    }
    if (preg_match('/^\s*Bearer\s+(\S+)\s*$/i', $header, $m)) {
        return $m[1];
    }
    $alt = $_SERVER['HTTP_X_ACCESS_KEY'] ?? '';
    if ($alt !== '') {
        return trim($alt);
    }

    // GET fallback for <a href> download/view links (browsers cannot set Authorization)
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'GET' || $method === 'HEAD') {
        $queryKey = $_GET['accessKey'] ?? $_GET['key'] ?? '';
        if ($queryKey !== '') {
            return trim($queryKey);
        }
    }

    return null;
}

function app_auth_enabled(): bool
{
    $env = getenv('AUTH_REQUIRED');
    if ($env !== false && $env !== '') {
        return filter_var($env, FILTER_VALIDATE_BOOLEAN);
    }
    // Auto-enable once any access key has been issued via generate-key.php
    $dir = __DIR__ . '/tokens';
    if (!is_dir($dir)) {
        return false;
    }
    foreach (glob($dir . '/*.json') ?: [] as $file) {
        return true;
    }
    return false;
}

function app_require_auth(): void
{
    if (!app_auth_enabled()) {
        return;
    }
    require_once __DIR__ . '/auth.php';
    $token = app_get_bearer_token();
    if ($token === null || !validateToken($token)) {
        app_json(['error' => 'Unauthorized', 'authRequired' => true], 401);
    }
}
