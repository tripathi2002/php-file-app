<?php

$token = bin2hex(random_bytes(16)); // secure token

$data = [
    'token' => $token,
    'expires' => time() + 3600 // 1 hour
];

file_put_contents(__DIR__ . '/tokens/' . $token . '.json', json_encode($data));

echo json_encode([
    'accessKey' => $token,
    'expiresIn' => '1 hour'
]);