# API v1

Base URL: `{SERVER}/api/v1/`

## Auth (required)

If no access key exists under `tokens/`, every protected endpoint returns `503` with `setupRequired: true`.

Otherwise send:

`Authorization: Bearer <accessKey>`

Generate (CLI only):

```bash
php generate-key.php
```

Public without auth: `health.php`, `version.php`.

Download/view links use **signed URLs** (`exp` + `sig`), not the access key in the query string.

## List

`GET /api/v1/list.php` → `Cache-Control: no-store`

```json
{
  "files": [
    {
      "name": "photo.png",
      "size": 12345,
      "mtime": 1710000000,
      "ext": "png",
      "mime": "image/png",
      "viewUrl": "api/v1/download.php?file=photo.png&exp=…&sig=…&view=1",
      "downloadUrl": "api/v1/download.php?…",
      "thumbUrl": "api/v1/download.php?…"
    }
  ],
  "allowedExtensions": ["jpg", "png", "mp3", "pptx", "…"],
  "accept": ".jpg,.png,…",
  "limits": {
    "maxUploadBytes": 52428800,
    "maxUploadMB": 50,
    "quotaBytes": 524288000,
    "usedBytes": 12345,
    "remainingBytes": 524275655
  }
}
```

## Upload chunk / merge / status / cancel

Same as 1.2, plus:

- Client must honor returned `uploadId`
- Oversized files / quota → `413`
- `cancel` returns `404` when the session does not exist
- Dangerous extensions anywhere in the name (e.g. `.php.txt`) are rejected

## Download

`GET /api/v1/download.php?file=…&exp=…&sig=…&view=0|1`

Also accepts Bearer auth (for scripted fetches). Always `Cache-Control: private, no-store`.

## Health / version

Unchanged public ops endpoints.
