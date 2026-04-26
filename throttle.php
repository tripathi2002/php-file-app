<?php

// function applyThrottle($delayMs = 200) {
//     $ip = $_SERVER['REMOTE_ADDR'];

//     $dir = __DIR__ . '/throttle/';
//     if (!file_exists($dir)) {
//         mkdir($dir, 0777, true);
//     }

//     $file = $dir . md5($ip) . '.txt';

//     $now = microtime(true); // high precision time

//     if (file_exists($file)) {
//         $lastTime = (float) file_get_contents($file);

//         $elapsed = ($now - $lastTime) * 1000; // ms

//         if ($elapsed < $delayMs) {
//             $sleepTime = ($delayMs - $elapsed) * 1000; // microseconds
//             usleep((int)$sleepTime);
//         }
//     }

//     // update last request time
//     file_put_contents($file, $now);
// }



function applyThrottle($delayMs = 200) {
    $ip = $_SERVER['REMOTE_ADDR'];

    $dir = __DIR__ . '/throttle/';

    // ✅ Ensure directory exists
    if (!file_exists($dir)) {
        mkdir($dir, 0777, true);
    }

    $file = $dir . md5($ip) . '.txt';

    // ✅ Open file safely
    $fp = fopen($file, 'c+');

    if (!$fp) {
        // fallback: skip throttle instead of crashing
        return;
    }

    if (flock($fp, LOCK_EX)) {

        // read last timestamp
        $content = fread($fp, 100);
        $lastTime = $content ? (float)$content : 0;

        $now = microtime(true);
        $elapsed = ($now - $lastTime) * 1000;

        if ($elapsed < $delayMs) {
            usleep((int)(($delayMs - $elapsed) * 1000));
        }

        // write new timestamp
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, $now);

        flock($fp, LOCK_UN);
    }

    fclose($fp);
}