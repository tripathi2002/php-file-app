<?php

function app_allowed_extensions(): array
{
    return [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'ico',
        'pdf',
        'mp4', 'webm', 'mp3', 'wav', 'ogg', 'm4a',
        'zip', 'txt', 'csv', 'json', 'md',
        'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    ];
}

function app_dangerous_extensions(): array
{
    return [
        'php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phps', 'phar',
        'cgi', 'pl', 'asp', 'aspx', 'jsp', 'jspx',
        'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'ps1', 'sh',
        'htaccess', 'htpasswd', 'shtml', 'html', 'htm', 'js', 'mjs',
    ];
}

function app_max_upload_bytes(): int
{
    $env = getenv('MAX_UPLOAD_BYTES');
    if ($env !== false && $env !== '' && is_numeric($env)) {
        return max(1024, (int) $env);
    }
    return 50 * 1024 * 1024; // 50 MB
}

function app_storage_quota_bytes(): int
{
    $env = getenv('STORAGE_QUOTA_BYTES');
    if ($env !== false && $env !== '' && is_numeric($env)) {
        return max(1024, (int) $env);
    }
    return 500 * 1024 * 1024; // 500 MB
}

function app_send_security_headers(): void
{
    if (headers_sent()) {
        return;
    }
    header_remove('X-Powered-By');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: no-referrer');
    header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
    header("Content-Security-Policy: default-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'");
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}

function app_json_headers(): void
{
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
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
        @mkdir($dir, $mode, true);
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

/** True only if final extension is allowed and no dangerous extension appears anywhere in the name. */
function app_extension_allowed(string $fileName): bool
{
    $lower = strtolower($fileName);
    foreach (app_dangerous_extensions() as $bad) {
        if (str_contains($lower, '.' . $bad . '.') || str_ends_with($lower, '.' . $bad)) {
            return false;
        }
    }
    $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    return $ext !== '' && in_array($ext, app_allowed_extensions(), true);
}

function app_accept_attribute(): string
{
    return implode(',', array_map(static fn($e) => '.' . $e, app_allowed_extensions()));
}

function app_sanitize_chunk_index($value): ?int
{
    if ($value === null || $value === '') {
        return null;
    }
    if (is_string($value) && !preg_match('/^\d+$/', $value)) {
        return null;
    }
    if (!is_numeric($value)) {
        return null;
    }
    $index = (int) $value;
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

function app_chunk_key(?string $uploadId, string $fileName): string
{
    $safeId = app_sanitize_upload_id($uploadId);
    if ($safeId !== null) {
        return $safeId;
    }
    return md5($fileName);
}

function app_dir_size(string $dir): int
{
    $total = 0;
    if (!is_dir($dir)) {
        return 0;
    }
    try {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS)
        );
        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $total += (int) $file->getSize();
            }
        }
    } catch (Throwable $e) {
        return $total;
    }
    return $total;
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
    return $alt !== '' ? trim($alt) : null;
}

function app_tokens_dir(): string
{
    return __DIR__ . '/tokens';
}

function app_has_any_token(): bool
{
    $dir = app_tokens_dir();
    if (!is_dir($dir)) {
        return false;
    }
    foreach (glob($dir . '/*.json') ?: [] as $file) {
        // Ignore empty/corrupt placeholder files
        $raw = @file_get_contents($file);
        $data = json_decode($raw ?: '', true);
        if (is_array($data) && !empty($data['token'])) {
            return true;
        }
    }
    return false;
}

/** Auth is always required. If no key has been issued, refuse with 503. */
function app_require_auth(): void
{
    require_once __DIR__ . '/auth.php';

    if (!app_has_any_token()) {
        app_json([
            'error' => 'Access key not configured on server. Run: php generate-key.php',
            'authRequired' => true,
            'setupRequired' => true,
        ], 503);
    }

    $token = app_get_bearer_token();
    if ($token === null || !validateToken($token)) {
        app_json(['error' => 'Unauthorized', 'authRequired' => true], 401);
    }
}

function app_signing_secret(): string
{
    $env = getenv('APP_SIGNING_SECRET');
    if (is_string($env) && $env !== '') {
        return $env;
    }
    $dir = app_tokens_dir();
    app_ensure_dir($dir, 0755);
    $file = $dir . '/.signing_secret';
    if (!is_file($file)) {
        file_put_contents($file, bin2hex(random_bytes(32)));
        @chmod($file, 0600);
    }
    $secret = trim((string) file_get_contents($file));
    return $secret !== '' ? $secret : 'insecure-fallback-change-me';
}

function app_sign_download(string $fileName, int $expires, bool $view = false): string
{
    $payload = $fileName . '|' . $expires . '|' . ($view ? '1' : '0');
    return hash_hmac('sha256', $payload, app_signing_secret());
}

function app_verify_download_signature(string $fileName, $expires, ?string $sig, bool $view = false): bool
{
    if ($sig === null || $sig === '' || !is_numeric($expires)) {
        return false;
    }
    $expires = (int) $expires;
    if ($expires < time()) {
        return false;
    }
    $expected = app_sign_download($fileName, $expires, $view);
    return hash_equals($expected, $sig);
}

function app_signed_download_url(string $fileName, bool $view = false, int $ttlSeconds = 300): string
{
    $expires = time() + $ttlSeconds;
    $sig = app_sign_download($fileName, $expires, $view);
    // Path relative to the app root (works for /file-app and /sit/file-app).
    $base = 'api/' . APP_API_VERSION . '/download.php';
    $query = http_build_query([
        'file' => $fileName,
        'exp' => $expires,
        'sig' => $sig,
        'view' => $view ? '1' : '0',
    ]);
    return $base . '?' . $query;
}

function app_rate_limit_headers(int $limit, int $remaining, int $retryAfter = 0): void
{
    if (headers_sent()) {
        return;
    }
    header('X-RateLimit-Limit: ' . $limit);
    header('X-RateLimit-Remaining: ' . max(0, $remaining));
    if ($retryAfter > 0) {
        header('Retry-After: ' . $retryAfter);
    }
}
