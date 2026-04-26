<?php

function checkRateLimit($limit = 5, $window = 1) {
    $ip = $_SERVER['REMOTE_ADDR'];

    $dir = __DIR__ . '/rate_limit/';
    if (!file_exists($dir)) {
        mkdir($dir, 0777, true);
    }

    $file = $dir . md5($ip) . '.json';

    $currentTime = time();

    $data = [
        'count' => 0,
        'start' => $currentTime
    ];

    if (file_exists($file)) {
        $data = json_decode(file_get_contents($file), true);

        // reset window
        if ($currentTime - $data['start'] >= $window) {
            $data = [
                'count' => 0,
                'start' => $currentTime
            ];
        }
    }

    $data['count']++;

    file_put_contents($file, json_encode($data));

    if ($data['count'] > $limit) {
        http_response_code(429);
        echo json_encode([
            'error' => 'Too many requests. Slow down.'
        ]);
        exit;
    }
}