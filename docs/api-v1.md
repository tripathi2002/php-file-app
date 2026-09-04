# API v1

Base URL: `{SERVER}/api/v1/`

Unversioned aliases (same contract): `{SERVER}/merge.php`, `{SERVER}/list.php`, and the other root PHP endpoints.

All v1 responses that go through `config.php` include header `X-API-Version: v1`.

## Version

`GET /api/v1/version.php` or `GET /version.php`

```json
{
  "api": "v1",
  "ui": "1.1.0",
  "uiPath": "ui/v1/",
  "compatibleUi": ["v1"]
}
```

## Upload chunk

`POST /api/v1/upload-chunk.php`

FormData:

- `file` — chunk blob
- `chunkIndex`
- `totalChunks`
- `fileName`

## Merge

`POST /api/v1/merge.php`  
`POST /merge.php` (legacy UI)

JSON body:

```json
{
  "fileName": "example.mp4",
  "totalChunks": 20
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

Do not change this shape in v1. A new merge protocol belongs in v2.

## List

`GET /api/v1/list.php` → JSON array of file names.

## Download

`GET /api/v1/download.php?file=example.mp4`

Viewing the stored file is not versioned: `{SERVER}/uploads/{file}`.

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
{ "fileName": "example.mp4" }
```
