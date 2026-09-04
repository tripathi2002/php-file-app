<?php
require 'config.php';

header('Content-Type: application/json');

echo json_encode([
    'api' => APP_API_VERSION,
    'ui' => APP_UI_VERSION,
    'uiPath' => 'ui/' . APP_API_VERSION . '/',
    'compatibleUi' => ['v1'],
]);
