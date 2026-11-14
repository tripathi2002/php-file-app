<?php
/** Tiny authenticated/space ping for latency checks. */
$root = dirname(__DIR__, 2);
require $root . '/config.php';

$started = microtime(true);
$space = app_detect_space();
app_set_space($space);

if ($space === 'personal') {
    // soft check — do not force auth for public tools
    $token = app_get_bearer_token();
    if ($token) {
        require_once __DIR__ . '/../../auth.php';
        $session = app_load_session($token);
        if ($session) {
            $user = app_load_user($session['userId']);
            if ($user) {
                app_set_current_user($user);
            }
        }
    }
}

header('Cache-Control: no-store');
app_json([
    'ok' => true,
    'space' => $space,
    'authenticated' => app_current_user() !== null,
    'serverTime' => gmdate('c'),
    'latencyHintMs' => (int) round((microtime(true) - $started) * 1000),
]);
