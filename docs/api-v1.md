# API v1

Base URL: `{SERVER}/api/v1/`

## Space + auth

Send space on every file op:

- Header `X-Space: public` or `personal` (also `?space=` / form field `space`)
- **Public:** no session; files under `storage/public/`
- **Personal:** `Authorization: Bearer <sessionToken>` from `session.php` (mobile + PIN)
- Mutating public ops return `403` with `readOnly: true` when env `PUBLIC_READONLY=1`

Always open without auth: `health.php`, `version.php`, `session.php`.

Download/view links use **signed URLs** (`exp` + `sig`, plus `uid=public` or the user id).

## List

`GET /api/v1/list.php?folder=`

Returns `folders`, `files`, `space`, `readOnly`, quota `limits`, signed URLs.

## Folders tree

`GET /api/v1/folders.php` → flat list of folder paths (for move UI).

## Stats

`GET /api/v1/stats.php` → recursive file/folder counts + used bytes.

## Upload chunk / merge / status / cancel

- Honor returned `uploadId`
- Oversized / quota → `413`
- `cancel` → `200` with `existed: false` if missing
- Dangerous extensions rejected

Legacy `upload.php` is space-aware (same storage as chunked path).

## Move / copy / batch-delete / zip

| Endpoint | Method | Notes |
|----------|--------|-------|
| `move.php` | POST | `name`, `fromFolder`, `toFolder`, `isFolder` |
| `copy.php` | POST | files only; `autoRename` for duplicates |
| `batch-delete.php` | POST | up to 50 items; empty folders only |
| `zip.php` | POST | up to 30 files → zip stream |

## Download

`GET /api/v1/download.php?file=…&uid=…&exp=…&sig=…&view=0|1`

Also accepts Bearer auth. `Cache-Control: private, no-store`.

## Search / stats / extras

| Endpoint | Notes |
|----------|-------|
| `search.php?q=` | Recursive name search (max 100) |
| `stats.php` | Recursive counts |
| `large-files.php` | Biggest files for cleanup |
| `folders.php` | Folder tree for move UI |
| `trash.php` | Soft-delete / restore / empty |
| `checksum.php` | md5/sha1/sha256 (≤100MB) |
| `write.php` | Create/edit txt/md/csv/json |
| `empty-folder.php` | Wipe folder contents |
| `change-pin.php` | Personal PIN rotate |
| `sessions.php` | List / revoke other sessions |
| `ping.php` | Latency probe |
| `quota.php` | Used/quota percent |
| `exists.php` | Name exists probe |
| `recent-server.php` | Newest files across space |
| `large-files.php` | Biggest files |

## Health / version

`health.php` checks storage, public, users, sessions, ZipArchive.  
`version.php` returns API + UI versions.
