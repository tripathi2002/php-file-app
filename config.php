<?php
define('APP_API_VERSION', 'v1');
define('APP_UI_VERSION', '1.3.0');

require_once __DIR__ . '/helpers.php';

app_send_security_headers();

// CORS: only origins in this allowlist receive CORS headers (default: same-origin only).
$allowedOrigins = array_filter(array_map('trim', explode(',', getenv('CORS_ALLOWED_ORIGINS') ?: '')));
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($requestOrigin !== '' && in_array($requestOrigin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $requestOrigin");
    header("Vary: Origin");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE, PUT");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Access-Key");
}
header('X-API-Version: ' . APP_API_VERSION);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Private storage — not web-reachable. Override with STORAGE_PATH env if needed.
$storageRoot = getenv('STORAGE_PATH');
if (!is_string($storageRoot) || $storageRoot === '') {
    $storageRoot = __DIR__ . '/storage';
}
$storageRoot = rtrim($storageRoot, '/\\');

define('STORAGE_ROOT', $storageRoot);
define('UPLOAD_DIR', STORAGE_ROOT . '/uploads/');
define('CHUNK_DIR', STORAGE_ROOT . '/chunks/');

app_ensure_dir(STORAGE_ROOT, 0755);
app_ensure_dir(UPLOAD_DIR, 0755);
app_ensure_dir(CHUNK_DIR, 0755);
app_ensure_dir(__DIR__ . '/throttle', 0755);
app_ensure_dir(__DIR__ . '/rate_limit', 0755);
app_ensure_dir(__DIR__ . '/tokens', 0755);

// Deny web access even if the folder is somehow mapped (defense in depth).
foreach ([STORAGE_ROOT, UPLOAD_DIR, CHUNK_DIR, __DIR__ . '/uploads', __DIR__ . '/chunks'] as $protected) {
    if (is_dir($protected)) {
        $deny = $protected . '/.htaccess';
        if (!is_file($deny)) {
            file_put_contents($deny, "Require all denied\n<IfModule !mod_authz_core.c>\nOrder deny,allow\nDeny from all\n</IfModule>\n");
        }
    }
}
