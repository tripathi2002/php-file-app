<?php
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('CHUNK_DIR', __DIR__ . '/chunks/');

foreach ([UPLOAD_DIR, CHUNK_DIR] as $dir) {
    if (!file_exists($dir)) {
        mkdir($dir, 0777, true);
    }
}