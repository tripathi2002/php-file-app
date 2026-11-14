<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

$relative = $_GET['file'] ?? null;
if (!is_string($relative) || $relative === '') {
    app_json(['error' => 'File not specified'], 400);
}

$viewParam = $_GET['view'] ?? '0';
$view = !in_array((string) $viewParam, ['0', 'false', ''], true);
$exp = $_GET['exp'] ?? null;
$sig = $_GET['sig'] ?? null;
$uid = isset($_GET['uid']) && preg_match('/^[a-f0-9]{32,128}$/i', $_GET['uid'])
    ? strtolower($_GET['uid'])
    : '';

$authorized = false;
$signedView = $uid !== '' && app_verify_download_signature($relative, $exp, $sig, true, $uid);
$signedDownload = $uid !== '' && app_verify_download_signature($relative, $exp, $sig, false, $uid);

if ($signedView || $signedDownload) {
    $authorized = true;
    $view = $signedView && !$signedDownload ? true : ($signedDownload && !$signedView ? false : $view);
    // Load user context for path resolution
    $user = app_load_user($uid);
    if ($user === null) {
        app_json(['error' => 'Unauthorized'], 401);
    }
    app_set_current_user($user);
} else {
    // Session auth fallback
    $token = app_get_bearer_token();
    $session = app_load_session($token);
    if ($session !== null) {
        $user = app_load_user($session['userId']);
        if ($user !== null) {
            app_set_current_user($user);
            $authorized = true;
        }
    }
}

if (!$authorized || app_current_user() === null) {
    app_json(['error' => 'Unauthorized', 'authRequired' => true], 401);
}

$filePath = app_resolve_user_file($relative);
if ($filePath === null || !is_file($filePath)) {
    app_json(['error' => 'File not found'], 404);
}

$mime = @mime_content_type($filePath) ?: 'application/octet-stream';
$disposition = $view ? 'inline' : 'attachment';
$size = filesize($filePath);
if ($size === false) {
    app_json(['error' => 'File not readable'], 500);
}

$baseName = basename($filePath);
header('Content-Description: File Transfer');
header('Content-Type: ' . $mime);
header('Content-Disposition: ' . $disposition . '; filename="' . str_replace('"', '', $baseName) . '"');
header('Content-Length: ' . $size);
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');
header('Pragma: no-cache');
header('Expires: 0');

readfile($filePath);
exit;
