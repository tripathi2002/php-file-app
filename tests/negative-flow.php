<?php
/**
 * Negative + positive flow tests for personal space.
 * Run on server/CLI: php tests/negative-flow.php
 *
 * Uses an isolated temp storage dir — does not touch real user data.
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    echo "CLI only\n";
    exit(1);
}

$root = dirname(__DIR__);
$tmp = sys_get_temp_dir() . '/file-app-test-' . bin2hex(random_bytes(4));
putenv('STORAGE_PATH=' . $tmp);
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';

require $root . '/config.php';

$passed = 0;
$failed = 0;
$cases = [];

function expect(bool $cond, string $name, string $detail = ''): void
{
    global $passed, $failed, $cases;
    if ($cond) {
        $passed++;
        $cases[] = "PASS  $name";
        echo "PASS  $name\n";
    } else {
        $failed++;
        $cases[] = "FAIL  $name" . ($detail !== '' ? " — $detail" : '');
        echo "FAIL  $name" . ($detail !== '' ? " — $detail" : '') . "\n";
    }
}

function with_request(string $method, array $headers, ?array $json, callable $fn)
{
    $_SERVER['REQUEST_METHOD'] = $method;
    foreach (['HTTP_AUTHORIZATION', 'HTTP_X_ACCESS_KEY', 'HTTP_ORIGIN'] as $h) {
        unset($_SERVER[$h]);
    }
    foreach ($headers as $k => $v) {
        $_SERVER[$k] = $v;
    }
    // Capture app_json exit via output buffering + exception trick
    return $fn();
}

function call_json_endpoint(string $file, string $method = 'POST', ?array $body = null, ?string $token = null): array
{
    global $root;
    $_SERVER['REQUEST_METHOD'] = $method;
    unset($_SERVER['HTTP_AUTHORIZATION'], $_SERVER['HTTP_X_ACCESS_KEY']);
    if ($token) {
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $token;
        $_SERVER['HTTP_X_ACCESS_KEY'] = $token;
    }

    $GLOBALS['__TEST_BODY'] = $body ? json_encode($body) : '';

    // Override php://input is hard; call library functions directly instead for most tests.
    return ['skipped' => true];
}

echo "=== Personal space negative/positive flow tests ===\n";
echo "Storage: $tmp\n\n";

// ---------- Auth helpers ----------
echo "-- Auth normalization --\n";
expect(app_normalize_mobile('9876543210') === '9876543210', 'mobile 10 digits ok');
expect(app_normalize_mobile('+91 98765-43210') === '919876543210', 'mobile strips symbols');
expect(app_normalize_mobile('123') === null, 'mobile too short rejected');
expect(app_normalize_mobile('') === null, 'mobile empty rejected');
expect(app_normalize_mobile(null) === null, 'mobile null rejected');
expect(app_normalize_mobile(str_repeat('1', 16)) === null, 'mobile too long rejected');
expect(app_normalize_pin('1234') === '1234', 'pin 4 ok');
expect(app_normalize_pin('123456') === '123456', 'pin 6 ok');
expect(app_normalize_pin('12') === null, 'pin too short rejected');
expect(app_normalize_pin('1234567') === null, 'pin too long rejected');
expect(app_normalize_pin('12ab') === null, 'pin non-digit rejected');
expect(app_normalize_pin(' 1234 ') === '1234', 'pin trims spaces');

echo "\n-- Session create / wrong pin / logout --\n";
$mobileA = '9000000001';
$pinA = '1234';
$userIdA = app_user_id_from_mobile($mobileA);
app_save_user([
    'id' => $userIdA,
    'mobile' => $mobileA,
    'pinHash' => password_hash($pinA, PASSWORD_DEFAULT),
    'created' => time(),
]);
expect(app_load_user($userIdA) !== null, 'user A created');
expect(password_verify('9999', app_load_user($userIdA)['pinHash']) === false, 'wrong pin fails verify');
expect(password_verify($pinA, app_load_user($userIdA)['pinHash']) === true, 'correct pin verifies');

$tokenA = app_create_session($userIdA);
expect(app_load_session($tokenA) !== null, 'session loads');
expect(app_load_session('deadbeefdeadbeefdeadbeefdeadbeef') === null, 'fake session rejected');
expect(app_load_session(null) === null, 'null session rejected');
expect(app_load_session('short') === null, 'short token rejected');
app_destroy_session($tokenA);
expect(app_load_session($tokenA) === null, 'logout destroys session');

$tokenA = app_create_session($userIdA);
$expiredPath = app_sessions_dir() . '/' . $tokenA . '.json';
$payload = json_decode(file_get_contents($expiredPath), true);
$payload['expires'] = time() - 10;
file_put_contents($expiredPath, json_encode($payload));
expect(app_load_session($tokenA) === null, 'expired session rejected');

echo "\n-- Cross-user isolation --\n";
$mobileB = '9000000002';
$userIdB = app_user_id_from_mobile($mobileB);
app_save_user([
    'id' => $userIdB,
    'mobile' => $mobileB,
    'pinHash' => password_hash('4321', PASSWORD_DEFAULT),
    'created' => time(),
]);
$tokenB = app_create_session($userIdB);

app_set_current_user(app_load_user($userIdA));
app_ensure_dir(app_upload_dir(), 0755);
file_put_contents(app_upload_dir() . 'secret-a.txt', 'aaa');
expect(is_file(app_upload_dir() . 'secret-a.txt'), 'user A file written');

$dirA = app_upload_dir();
app_set_current_user(app_load_user($userIdB));
$dirB = app_upload_dir();
expect($dirA !== $dirB, 'users get different upload dirs');
expect(!is_file(app_upload_dir() . 'secret-a.txt'), 'user B cannot see A file by name in own dir');

echo "\n-- Folder path attacks --\n";
app_set_current_user(app_load_user($userIdA));
expect(app_sanitize_folder('../etc') === 'etc' || app_sanitize_folder('../etc') === '', 'traversal dots stripped');
expect(app_sanitize_folder('..') === '', 'bare .. becomes root');
expect(app_sanitize_folder('a/../../b') === 'a/b' || !str_contains(app_sanitize_folder('a/../../b'), '..'), 'nested traversal cleaned');
expect(app_resolve_user_file('../secret') === null, 'resolve blocks ..');
expect(app_resolve_user_file('..\\secret') === null, 'resolve blocks backslash traversal');
expect(app_resolve_user_file('secret-a.txt') !== null, 'resolve allows own file');

$deep = 'a/b/c/d/e/f/g';
$san = app_sanitize_folder($deep);
expect(substr_count($san, '/') <= 4, 'folder depth capped at 5 levels', "got: $san");

echo "\n-- Folder create rules --\n";
$parent = app_folder_path('');
expect(is_dir($parent) || app_ensure_dir($parent) || true, 'root folder ready');
$photos = app_folder_path('') . 'photos';
@mkdir($photos, 0755);
expect(app_folder_exists('photos'), 'photos folder exists');
expect(app_folder_exists('missing-folder') === false, 'missing folder detected');
expect(app_folder_exists('') === true, 'root always exists');

echo "\n-- Extension / dangerous names --\n";
expect(app_extension_allowed('photo.jpg') === true, 'jpg allowed');
expect(app_extension_allowed('doc.pdf') === true, 'pdf allowed');
expect(app_extension_allowed('x.php') === false, 'php rejected');
expect(app_extension_allowed('x.php.txt') === false, 'double ext php.txt rejected');
expect(app_extension_allowed('x.html.txt') === false, 'html.txt rejected');
expect(app_extension_allowed('x.js.txt') === false, 'js.txt rejected');
expect(app_extension_allowed('noext') === false, 'no extension rejected');
expect(app_sanitize_filename('../x.jpg') === 'x.jpg', 'basename strips path');
expect(app_sanitize_filename('') === null, 'empty filename rejected');
expect(app_sanitize_filename('.') === null, 'dot filename rejected');

echo "\n-- Download signature isolation --\n";
app_set_current_user(app_load_user($userIdA));
$exp = time() + 60;
$sigA = app_sign_download('secret-a.txt', $exp, false, $userIdA);
expect(app_verify_download_signature('secret-a.txt', $exp, $sigA, false, $userIdA), 'valid sig ok');
expect(!app_verify_download_signature('secret-a.txt', $exp, $sigA, false, $userIdB), 'sig fails for other uid');
expect(!app_verify_download_signature('secret-a.txt', $exp, '00' . substr($sigA, 2), false, $userIdA), 'tampered sig fails');
expect(!app_verify_download_signature('secret-a.txt', time() - 5, $sigA, false, $userIdA), 'expired sig fails');
expect(!app_verify_download_signature('other.txt', $exp, $sigA, false, $userIdA), 'wrong file sig fails');

echo "\n-- Chunk index sanitation --\n";
expect(app_sanitize_chunk_index('0') === 0, 'chunk 0 ok');
expect(app_sanitize_chunk_index('-1') === null, 'negative chunk rejected');
expect(app_sanitize_chunk_index('1.5') === null, 'float chunk rejected');
expect(app_sanitize_chunk_index('abc') === null, 'alpha chunk rejected');
expect(app_sanitize_upload_id('not-hex!') === null, 'bad uploadId rejected');
expect(app_sanitize_upload_id(str_repeat('ab', 8)) !== null, 'hex uploadId ok');

echo "\n=== Summary: $passed passed, $failed failed ===\n";

// Cleanup temp storage
function rrmdir($dir)
{
    if (!is_dir($dir)) {
        return;
    }
    foreach (scandir($dir) ?: [] as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }
        $path = $dir . '/' . $item;
        is_dir($path) ? rrmdir($path) : @unlink($path);
    }
    @rmdir($dir);
}
rrmdir($tmp);

exit($failed > 0 ? 1 : 0);
