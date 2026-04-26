<?php
require 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (!isset($_FILES['file'])) {
        echo json_encode(['error' => 'No file uploaded']);
        exit;
    }

    $file = $_FILES['file'];
    $fileName = basename($file['name']);
    $targetPath = UPLOAD_DIR . $fileName;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        echo json_encode([
            'message' => 'File uploaded successfully',
            'file' => $fileName
        ]);
    } else {
        echo json_encode(['error' => 'Upload failed']);
    }
}