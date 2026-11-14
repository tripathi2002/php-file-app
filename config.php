<?php
define('APP_API_VERSION', 'v1');
define('APP_UI_VERSION', '1.7.0');

require_once __DIR__ . '/helpers.php';

app_send_security_headers();

$allowedOrigins = array_filter(array_map('trim', explode(',', getenv('CORS_ALLOWED_ORIGINS') ?: '')));
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($requestOrigin !== '' && in_array($requestOrigin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $requestOrigin");
    header("Vary: Origin");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE, PUT");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Access-Key, X-Space");
}
header('X-API-Version: ' . APP_API_VERSION);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$storageRoot = getenv('STORAGE_PATH');
if (!is_string($storageRoot) || $storageRoot === '') {
    $storageRoot = __DIR__ . '/storage';
}
$storageRoot = rtrim($storageRoot, '/\\');

define('STORAGE_ROOT', $storageRoot);
// Legacy shared dirs (unused for personal spaces; kept for migration/cleanup)
define('UPLOAD_DIR', STORAGE_ROOT . '/uploads/');
define('CHUNK_DIR', STORAGE_ROOT . '/chunks/');

require_once __DIR__ . '/auth.php';

app_ensure_dir(STORAGE_ROOT, 0755);
app_ensure_dir(UPLOAD_DIR, 0755);
app_ensure_dir(CHUNK_DIR, 0755);
app_ensure_dir(app_public_root(), 0755);
app_ensure_dir(app_public_root() . '/files', 0755);
app_ensure_dir(app_public_root() . '/chunks', 0755);
app_ensure_dir(app_users_dir(), 0755);
app_ensure_dir(app_sessions_dir(), 0755);
app_ensure_dir(__DIR__ . '/throttle', 0755);
app_ensure_dir(__DIR__ . '/rate_limit', 0755);
app_ensure_dir(__DIR__ . '/tokens', 0755);

foreach ([STORAGE_ROOT, UPLOAD_DIR, CHUNK_DIR, app_public_root(), app_users_dir(), app_sessions_dir(), __DIR__ . '/uploads', __DIR__ . '/chunks'] as $protected) {
    if (is_dir($protected)) {
        $deny = $protected . '/.htaccess';
        if (!is_file($deny)) {
            @file_put_contents($deny, "Require all denied\n<IfModule !mod_authz_core.c>\nOrder deny,allow\nDeny from all\n</IfModule>\n");
        }
    }
}
