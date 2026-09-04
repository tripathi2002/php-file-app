<?php
define('APP_API_VERSION', 'v1');
define('APP_UI_VERSION', '1.1.1');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE, PUT");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('X-API-Version: ' . APP_API_VERSION);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('CHUNK_DIR', __DIR__ . '/chunks/');


$dirs = ['uploads', 'chunks', 'throttle', 'rate_limit'];

foreach ($dirs as $d) {
    if (!file_exists(__DIR__ . "/$d")) {
        mkdir(__DIR__ . "/$d", 0777, true);
    }
}

foreach ([UPLOAD_DIR, CHUNK_DIR] as $dir) {
    if (!file_exists($dir)) {
        mkdir($dir, 0777, true);
    }
}

