<?php

function applyThrottle($delayMs = 200) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    $dir = __DIR__ . '/throttle/';

    if (!file_exists($dir)) {
        mkdir($dir, 0755, true);
    }

    $file = $dir . md5($ip) . '.txt';

    $fp = fopen($file, 'c+');

    if (!$fp) {
        return;
    }

    if (flock($fp, LOCK_EX)) {
        $content = fread($fp, 100);
        $lastTime = $content ? (float) $content : 0;

        $now = microtime(true);
        $elapsed = ($now - $lastTime) * 1000;

        if ($elapsed < $delayMs) {
            usleep((int) (($delayMs - $elapsed) * 1000));
        }

        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, (string) $now);

        flock($fp, LOCK_UN);
    }

    fclose($fp);
}
