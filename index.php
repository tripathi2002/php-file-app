<!DOCTYPE html>
<html>

<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>File Upload</title>
    <link rel="icon" href="favicon.png" type="image/png">
    <link rel="stylesheet" href="style.css">

</head>

<body>

    <div class="container">

        <h2>📤 File Upload</h2>

        <div class="card">
            <!-- <input type="file" id="fileInput" class="file-input"> -->

            <div class="drop-zone" id="dropZone">
                <!-- <div>
                    <p>📂 Drag & Drop file here</p>
                    <p>or click to select</p>
                </div> -->
                <label id="dropContent" for="fileInput" class="drop-content">
                    <p>📂 Tap or Drag file</p>
                    <p>Click to select</p>
                </label>

            </div>
            <input type="file" id="fileInput" class="file-input visually-hidden">

            <br>
            <div class="btn-group">
                <button class="upload" onclick="startUpload()">Upload</button>
                <button class="pause" onclick="pauseUpload()">Pause</button>
                <button class="resume" onclick="resumeUpload()">Resume</button>
                <button class="cancel" onclick="cancelUpload()">Cancel</button>
            </div>

            <div class="progress">
                <div class="progress-bar" id="progressBar"></div>
            </div>

            <p id="status"></p>
        </div>

        <div class="card file-list">
            <h3>Files</h3>
            <ul id="fileList"></ul>
        </div>

    </div>
    <script src="script.js?v=1.0.1"></script>
</body>

</html>