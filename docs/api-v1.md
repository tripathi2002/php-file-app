# API v1

Base URL: `{SERVER}/api/v1/`

Unversioned aliases (same contract): `{SERVER}/merge.php`, `{SERVER}/list.php`, and the other root PHP endpoints.

All v1 responses that go through `config.php` include header `X-API-Version: v1`.

## Auth

Once any access key exists under `tokens/` (or `AUTH_REQUIRED=1`), protected endpoints require:

`Authorization: Bearer <accessKey>`

For download/view links, `?accessKey=` is also accepted on GET.

Generate a key (CLI only):

```bash
php generate-key.php
php generate-key.php --days=90
```

Public without auth: `health.php`, `version.php`.

## Version

`GET /api/v1/version.php` or `GET /version.php`

```json
{
  "api": "v1",
  "ui": "1.2.0",
  "uiPath": "ui/v1/",
  "compatibleUi": ["v1"]
}
```

## Upload chunk

`POST /api/v1/upload-chunk.php`

FormData:

- `file` — chunk blob
- `chunkIndex` — non-negative integer
- `totalChunks` — optional, must be > chunkIndex when set
- `fileName`
- `uploadId` — optional hex id (16–64 chars); preferred over `md5(fileName)` for the chunk folder

## Merge

`POST /api/v1/merge.php`  
`POST /merge.php` (legacy UI)

JSON body:

```json
{
  "fileName": "example.mp4",
  "totalChunks": 20,
  "uploadId": "optional-hex-session-id",
  "overwrite": false
}
```

Success:

```json
{
  "message": "File merged successfully",
  "file": "example.mp4"
}
```

Errors (v1): `{ "error": "Invalid request", "received": {} }` or `{ "error": "Missing chunk N" }`.  
Conflict when file exists and `overwrite` is not true: `409` + `{ "error": "File already exists", "file": "…" }`.

Do not change required field shapes in v1. A new merge protocol belongs in v2.

## Upload status (resume)

`GET /api/v1/status.php?uploadId=…&fileName=…&totalChunks=20`

```json
{
  "uploadId": "…",
  "received": [0, 1, 2],
  "missing": [3, 4],
  "complete": false
}
```

## List

`GET /api/v1/list.php` → JSON array of file names (skips `.gitkeep` and hidden files).

## Download / view

`GET /api/v1/download.php?file=example.mp4`  
`GET /api/v1/download.php?file=example.mp4&view=1` — inline disposition

Direct `{SERVER}/uploads/{file}` is blocked; always use `download.php`.

## Delete

`DELETE /api/v1/delete.php`

```json
{ "fileName": "example.mp4" }
```

## Rename

`PUT /api/v1/rename.php`

```json
{ "oldName": "a.mp4", "newName": "b.mp4" }
```

## Cancel

`POST /api/v1/cancel.php`

```json
{ "fileName": "example.mp4", "uploadId": "optional" }
```

## Health check

`GET /api/v1/health.php` or `GET /health.php`

Returns `200` with `{"status":"ok", ...}` when the `uploads/` and `chunks/` directories are writable, otherwise `503` with `"status":"degraded"` and per-check booleans.
