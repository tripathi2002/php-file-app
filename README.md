# PHP Chunk File Upload System

Lightweight PHP app for uploading large files with **chunked uploads**, list/view/download, rename, and delete. Runs on shared hosting (Hostinger + WordPress sibling at vibhu.pro).

**Current versions:** API `v1` · UI `1.2.0`

Hosting notes: [docs/hosting-wordpress.md](docs/hosting-wordpress.md)  
API contract: [docs/api-v1.md](docs/api-v1.md) · Versioning: [docs/versioning.md](docs/versioning.md)

---

## Features

- Chunked upload with pause / resume / cancel
- Upload session IDs (safe concurrent same-name uploads)
- File list, view, download, rename, delete
- Optional access-key auth (auto-on after you generate a key)
- Rate limit + throttle on write-heavy endpoints
- Health check for uptime monitors

---

## Setup

1. Deploy the repo to `/public_html/file-app` (or SIT `sit/file-app` via GitHub Actions).
2. Ensure runtime folders exist and are writable: `uploads`, `chunks`, `tokens`, `throttle`, `rate_limit`.
3. Add the WordPress root passthrough from [docs/hosting-wordpress.md](docs/hosting-wordpress.md).
4. (Recommended) Issue an access key on the server:

```bash
php generate-key.php
# or: php generate-key.php --days=90
```

Paste the key in the UI (**Key** button). Once any key exists, API auth is required.

---

## Upload flow

1. File split into 5MB chunks  
2. `POST /api/v1/upload-chunk.php` (FormData: file, chunkIndex, totalChunks, fileName, uploadId)  
3. `POST /api/v1/merge.php` → file lands in `/uploads`  
4. UI views/downloads via `/api/v1/download.php` (direct `/uploads/` URLs are blocked)

---

## Health

`GET /api/v1/health.php` → `200` when storage is writable, else `503`.
