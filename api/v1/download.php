<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

$fileName = app_sanitize_filename($_GET['file'] ?? null);
if ($fileName === null) {
    app_json(['error' => 'File not specified'], 400);
}

$viewParam = $_GET['view'] ?? '0';
$view = !in_array((string) $viewParam, ['0', 'false', ''], true);
$exp = $_GET['exp'] ?? null;
$sig = $_GET['sig'] ?? null;

$authorized = false;
$signedView = app_verify_download_signature($fileName, $exp, $sig, true);
$signedDownload = app_verify_download_signature($fileName, $exp, $sig, false);

if ($signedView || $signedDownload) {
    $authorized = true;
    // Use the disposition that matches the signature that validated
    $view = $signedView && !$signedDownload ? true : ($signedDownload && !$signedView ? false : $view);
} else {
    require_once $root . '/auth.php';
    if (app_has_any_token()) {
        $token = app_get_bearer_token();
        if ($token !== null && validateToken($token)) {
            $authorized = true;
        }
    }
}

if (!$authorized) {
    if (!app_has_any_token()) {
        app_json([
            'error' => 'Access key not configured on server. Run: php generate-key.php',
            'authRequired' => true,
            'setupRequired' => true,
        ], 503);
    }
    app_json(['error' => 'Unauthorized', 'authRequired' => true], 401);
}

$filePath = UPLOAD_DIR . $fileName;

if (!file_exists($filePath) || !is_file($filePath)) {
    app_json(['error' => 'File not found'], 404);
}

$mime = @mime_content_type($filePath) ?: 'application/octet-stream';
$disposition = $view ? 'inline' : 'attachment';
$size = filesize($filePath);
if ($size === false) {
    app_json(['error' => 'File not readable'], 500);
}

header('Content-Description: File Transfer');
header('Content-Type: ' . $mime);
header('Content-Disposition: ' . $disposition . '; filename="' . str_replace('"', '', $fileName) . '"');
header('Content-Length: ' . $size);
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');
header('Pragma: no-cache');
header('Expires: 0');

readfile($filePath);
exit;
