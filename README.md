# PHP Chunk File Upload System

Lightweight PHP app for uploading large files with **chunked uploads**, list/view/download, rename, and delete. Runs on shared hosting (Hostinger + WordPress sibling).

**Current versions:** API `v1` · UI `1.3.0`

Hosting notes: [docs/hosting-wordpress.md](docs/hosting-wordpress.md)  
API contract: [docs/api-v1.md](docs/api-v1.md)

---

## Security model

1. Generate a key on the server (required — APIs refuse traffic until one exists):

```bash
php generate-key.php
# optional: php generate-key.php --days=90
```

2. Open the UI → **Key** → paste the token (stored in `localStorage`, sent as `Authorization: Bearer …`).
3. Files live in private `storage/uploads` (not HTTP-reachable). View/Download use short-lived signed links.

---

## Features

- Chunked upload with pause / resume / cancel and upload session IDs
- File list with size, date, type badge / image thumbnail
- Storage quota bar and clear max file size (default 50 MB / 500 MB quota)
- Rate limit + throttle on write-heavy endpoints
- Health check for uptime monitors

---

## Setup

1. Deploy to `/public_html/file-app` (or SIT `sit/file-app` via GitHub Actions).
2. Ensure `storage/uploads`, `storage/chunks`, `tokens`, `throttle`, `rate_limit` are writable.
3. Add the WordPress root passthrough from [docs/hosting-wordpress.md](docs/hosting-wordpress.md).
4. Run `php generate-key.php` and unlock the UI.

Optional env vars: `STORAGE_PATH`, `MAX_UPLOAD_BYTES`, `STORAGE_QUOTA_BYTES`, `APP_SIGNING_SECRET`, `AUTH_REQUIRED`, `CORS_ALLOWED_ORIGINS`.

---

## Health

`GET /api/v1/health.php` → `200` when storage is writable, else `503`.
