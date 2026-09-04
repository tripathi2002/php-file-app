# 📦 PHP Chunk File Upload System

A simple, scalable PHP application for uploading large files using **chunked uploads**, with support for file listing, viewing, and downloading.

**Current versions:** API `v2` (latest) · UI `2.0.0` · frozen `v1` in `api/v1/` + `ui/v1/`

On vibhu.pro (WordPress at the domain root), see [docs/hosting-wordpress.md](docs/hosting-wordpress.md).

See **[docs/](docs/README.md)** for versioning rules and the v1 API contract. Breaking merge changes must ship as API v2 so older UIs keep working.

---

## 🚀 Features

- ✅ Chunk-based file upload (handles large files)
- ✅ File merge after upload
- ✅ File listing API
- ✅ View & download files
- ✅ Lightweight (no framework)
- ✅ Works on shared hosting

---

## 📁 Project Structure
files-app/
│── uploads/ # final merged files
│── chunks/ # temporary chunk storage
│── upload-chunk.php # upload chunks API
│── merge.php # merge chunks API
│── list.php # list uploaded files
│── download.php # download file
│── config.php # config
│── index.html # UI
│── .htaccess # server config


---

## ⚙️ Setup

1. Clone repo:
bash
git clone <your-repo-url>

2. Move to server:
/public_html/files-app

3. Ensure folders exist:
mkdir uploads chunks
chmod -R 777 uploads chunks

4. Add .gitkeep files (optional for Git)

📤 Upload Flow
File is split into chunks (5MB default)
Each chunk is uploaded via:
POST /upload-chunk.php
After all chunks uploaded:
POST /merge.php
Server merges chunks → final file stored in /uploads

📡 API Endpoints
Upload Chunk
POST /upload-chunk.php
FormData:
- file
- chunkIndex
- totalChunks
- fileName

Merge File
POST /merge.php
Body (JSON):
{
  "fileName": "example.mp4",
  "totalChunks": 20
}

List Files
GET /list.php
Download File
GET /download.php?file=example.mp4

🌐 UI

Open in browser:

http://your-domain/files-app/