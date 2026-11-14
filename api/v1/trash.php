<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

app_require_space();
app_require_writable_space();

function app_trash_dir(): string
{
    $dir = rtrim(app_upload_dir(), '/\\') . '/.trash';
    app_ensure_dir($dir, 0755);
    return $dir;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$data = json_decode(file_get_contents('php://input'), true) ?? [];

if ($method === 'GET') {
    $dir = app_trash_dir();
    $items = [];
    foreach (scandir($dir) ?: [] as $name) {
        if ($name === '.' || $name === '..' || $name === '.gitkeep' || $name === '.htaccess') {
            continue;
        }
        $path = $dir . '/' . $name;
        if (!is_file($path)) {
            continue;
        }
        $meta = null;
        if (str_ends_with($name, '.json')) {
            continue;
        }
        $metaPath = $path . '.json';
        if (is_file($metaPath)) {
            $meta = json_decode((string) file_get_contents($metaPath), true);
        }
        $items[] = [
            'id' => $name,
            'name' => is_array($meta) ? ($meta['name'] ?? $name) : $name,
            'folder' => is_array($meta) ? ($meta['folder'] ?? '') : '',
            'size' => @filesize($path) ?: 0,
            'mtime' => @filemtime($path) ?: time(),
            'deletedAt' => is_array($meta) ? ($meta['deletedAt'] ?? null) : null,
        ];
    }
    usort($items, static fn($a, $b) => ($b['mtime'] <=> $a['mtime']));
    app_json(['items' => $items, 'count' => count($items)]);
}

if ($method === 'POST') {
    $action = $data['action'] ?? 'softDelete';

    if ($action === 'softDelete') {
        $folder = app_sanitize_folder($data['folder'] ?? '');
        $name = app_sanitize_filename($data['name'] ?? $data['fileName'] ?? null);
        if ($name === null) {
            app_json(['error' => 'Name required'], 400);
        }
        $src = app_folder_path($folder) . $name;
        if (!is_file($src)) {
            app_json(['error' => 'File not found (folders use hard delete)'], 404);
        }
        $id = bin2hex(random_bytes(8)) . '_' . $name;
        $dest = app_trash_dir() . '/' . $id;
        if (!@rename($src, $dest)) {
            app_json(['error' => 'Move to trash failed'], 500);
        }
        @file_put_contents($dest . '.json', json_encode([
            'name' => $name,
            'folder' => $folder,
            'deletedAt' => gmdate('c'),
        ], JSON_PRETTY_PRINT));
        app_json(['message' => 'Moved to trash', 'id' => $id]);
    }

    if ($action === 'restore') {
        $id = app_sanitize_filename($data['id'] ?? null);
        if ($id === null) {
            app_json(['error' => 'Trash id required'], 400);
        }
        $src = app_trash_dir() . '/' . $id;
        $metaPath = $src . '.json';
        if (!is_file($src)) {
            app_json(['error' => 'Not in trash'], 404);
        }
        $meta = is_file($metaPath) ? json_decode((string) file_get_contents($metaPath), true) : [];
        $name = app_sanitize_filename($meta['name'] ?? $id);
        $folder = app_sanitize_folder($meta['folder'] ?? '');
        if ($name === null) {
            app_json(['error' => 'Invalid trash item'], 400);
        }
        if ($folder !== '' && !app_folder_exists($folder)) {
            app_ensure_dir(app_folder_path($folder), 0755);
        }
        $dest = app_folder_path($folder) . $name;
        if (file_exists($dest)) {
            $base = pathinfo($name, PATHINFO_FILENAME);
            $ext = pathinfo($name, PATHINFO_EXTENSION);
            $n = 2;
            do {
                $candidate = $base . ' restored ' . $n . ($ext !== '' ? '.' . $ext : '');
                $safe = app_sanitize_filename($candidate);
                $n++;
            } while ($safe !== null && file_exists(app_folder_path($folder) . $safe) && $n < 50);
            if ($safe === null) {
                app_json(['error' => 'Name conflict'], 409);
            }
            $name = $safe;
            $dest = app_folder_path($folder) . $name;
        }
        if (!@rename($src, $dest)) {
            app_json(['error' => 'Restore failed'], 500);
        }
        @unlink($metaPath);
        app_json(['message' => 'Restored', 'name' => $name, 'folder' => $folder]);
    }

    if ($action === 'purge' || $action === 'empty') {
        $dir = app_trash_dir();
        $removed = 0;
        foreach (scandir($dir) ?: [] as $name) {
            if ($name === '.' || $name === '..') {
                continue;
            }
            $path = $dir . '/' . $name;
            if (is_file($path) && @unlink($path)) {
                $removed++;
            }
        }
        app_json(['message' => 'Trash emptied', 'removed' => $removed]);
    }

    app_json(['error' => 'Unknown action'], 400);
}

app_json(['error' => 'Method not allowed'], 405);
