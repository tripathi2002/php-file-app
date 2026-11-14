<?php

function validateToken($token) {
    if (!is_string($token) || !preg_match('/^[a-f0-9]{16,64}$/i', $token)) {
        return false;
    }

    $file = __DIR__ . '/tokens/' . strtolower($token) . '.json';

    if (!file_exists($file)) {
        return false;
    }

    $raw = file_get_contents($file);
    $data = json_decode($raw ?: '', true);

    if (!is_array($data) || !isset($data['expires'])) {
        return false;
    }

    if ((int) $data['expires'] < time()) {
        @unlink($file);
        return false;
    }

    return true;
}
