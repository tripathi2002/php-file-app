<?php
$root = dirname(__DIR__, 2);
require $root . '/config.php';

$data = json_decode(file_get_contents('php://input'), true) ?? [];

$oldName = $data['oldName'] ?? null;
$newName = $data['newName'] ?? null;

$newName = preg_replace('/[^a-zA-Z0-9._-]/', '', $newName);

$ext = pathinfo($oldName, PATHINFO_EXTENSION);

if (!str_contains($newName, '.')) {
    $newName .= '.' . $ext;
}

if (!$oldName || !$newName) {
    echo json_encode(['error' => 'Invalid request']);
    exit;
}

$oldName = basename($oldName);
$newName = basename($newName);

$oldPath = UPLOAD_DIR . $oldName;
$newPath = UPLOAD_DIR . $newName;

if (!file_exists($oldPath)) {
    echo json_encode(['error' => 'File not found']);
    exit;
}

if (file_exists($newPath)) {
    echo json_encode(['error' => 'File with new name already exists']);
    exit;
}

if (rename($oldPath, $newPath)) {
    echo json_encode(['message' => 'Renamed successfully']);
} else {
    echo json_encode(['error' => 'Rename failed']);
}
