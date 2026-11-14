<?php

function checkRateLimit($limit = 5, $window = 1) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    $dir = __DIR__ . '/rate_limit/';
    if (!file_exists($dir)) {
        mkdir($dir, 0755, true);
    }

    $file = $dir . md5($ip) . '.json';
    $currentTime = time();

    $fp = fopen($file, 'c+');
    if (!$fp) {
        return;
    }

    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        return;
    }

    $raw = stream_get_contents($fp);
    $data = $raw ? json_decode($raw, true) : null;

    if (!is_array($data) || !isset($data['count'], $data['start'])) {
        $data = [
            'count' => 0,
            'start' => $currentTime,
        ];
    }

    if ($currentTime - (int) $data['start'] >= $window) {
        $data = [
            'count' => 0,
            'start' => $currentTime,
        ];
    }

    $data['count']++;

    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    if ($data['count'] > $limit) {
        app_json(['error' => 'Too many requests. Slow down.'], 429);
    }
}
