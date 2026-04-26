<?php
require 'config.php';

$files = array_diff(scandir(UPLOAD_DIR), ['.', '..']);
?>

<!DOCTYPE html>
<html>
<head>
    <title>File Manager</title>
</head>
<body>

<h2>Upload File</h2>
<form action="upload.php" method="POST" enctype="multipart/form-data">
    <input type="file" name="file" required>
    <button type="submit">Upload</button>
</form>

<h2>Files</h2>
<ul>
    <?php foreach ($files as $file): ?>
        <li>
            <?php echo $file; ?> |
            <a href="uploads/<?php echo $file; ?>" target="_blank">View</a> |
            <a href="download.php?file=<?php echo $file; ?>">Download</a>
        </li>
    <?php endforeach; ?>
</ul>

</body>
</html>