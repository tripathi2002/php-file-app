<!DOCTYPE html>
<html>

<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>File Upload</title>

    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            background: #f5f7fb;
        }

        .container {
            max-width: 600px;
            margin: auto;
            padding: 16px;
        }

        h2 {
            text-align: center;
        }

        .card {
            background: white;
            padding: 16px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
            margin-bottom: 20px;
        }

        .file-input {
            width: 100%;
            margin-bottom: 10px;
        }

        .btn-group {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        button {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
        }

        .upload {
            background: #4caf50;
            color: white;
        }

        .pause {
            background: #ff9800;
            color: white;
        }

        .resume {
            background: #2196f3;
            color: white;
        }

        .cancel {
            background: #f44336;
            color: white;
        }

        .progress {
            margin-top: 15px;
            height: 10px;
            background: #eee;
            border-radius: 10px;
            overflow: hidden;
        }

        .progress-bar {
            height: 100%;
            width: 0%;
            background: #4caf50;
            transition: width 0.3s;
        }

        #status {
            margin-top: 10px;
            font-size: 14px;
            text-align: center;
        }

        .file-list ul {
            list-style: none;
            padding: 0;
        }

        .file-list li {
            background: #fafafa;
            margin-bottom: 8px;
            padding: 10px;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .file-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .file-actions a,
        .file-actions button {
            font-size: 12px;
            padding: 6px 10px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
        }

        .view {
            background: #2196f3;
            color: white;
        }

        .download {
            background: #4caf50;
            color: white;
        }

        .delete {
            background: #f44336;
            color: white;
        }

        /* 📱 Mobile tweaks */
        @media (max-width: 480px) {
            button {
                font-size: 13px;
                padding: 10px;
            }

            h2 {
                font-size: 18px;
            }
        }
    </style>
</head>

<body>

    <div class="container">

        <h2>📤 File Upload</h2>

        <div class="card">
            <input type="file" id="fileInput" class="file-input">

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
    <script src="script.js"></script>
</body>

</html>