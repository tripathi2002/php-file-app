<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

$files = array_values(array_diff(scandir(UPLOAD_DIR), ['.', '..']));
echo json_encode($files);
