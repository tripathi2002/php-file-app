<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

header('Content-Type: application/json');

echo json_encode([
    'api' => APP_API_VERSION,
    'ui' => APP_UI_VERSION,
    'uiPath' => 'ui/' . APP_API_VERSION . '/',
    'compatibleUi' => ['v1'],
]);
