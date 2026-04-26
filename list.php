<?php
require 'config.php';

$files = array_values(array_diff(scandir(UPLOAD_DIR), ['.', '..']));
echo json_encode($files);