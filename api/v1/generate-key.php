<?php
$root = dirname(__DIR__, 2);

$token = bin2hex(random_bytes(16));

$data = [
    'token' => $token,
    'expires' => time() + 3600,
];

file_put_contents($root . '/tokens/' . $token . '.json', json_encode($data));

echo json_encode([
    'accessKey' => $token,
    'expiresIn' => '1 hour',
]);
