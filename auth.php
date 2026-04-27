<?php

function validateToken($token) {
    $file = __DIR__ . '/tokens/' . $token . '.json';

    if (!file_exists($file)) {
        return false;
    }

    $data = json_decode(file_get_contents($file), true);

    if ($data['expires'] < time()) {
        unlink($file); // auto cleanup expired
        return false;
    }

    return true;
}