<?php
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

