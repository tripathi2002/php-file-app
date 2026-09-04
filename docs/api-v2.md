# API v2

**Status:** scaffolded (same behavior as v1). Requirements TBD.

Base URL: `{SERVER}/api/v2/`

Version: `GET /api/v2/version.php`

```json
{
  "api": "v2",
  "ui": "2.0.0",
  "uiPath": "ui/v2/",
  "compatibleUi": ["v2"]
}
```

## Where to implement v2 changes

| Area | File |
| --- | --- |
| Merge / upload flow | `api/v2/merge.php`, `api/v2/upload-chunk.php` |
| File list / metadata | `api/v2/list.php` |
| Delete / rename | `api/v2/delete.php`, `api/v2/rename.php` |
| UI | `modules/`, `ui/v2/`, root `index.html` |

**Do not edit** `api/v1/` for breaking changes — that stays frozen for old clients.

## Requirements

_Add your v2 requirements here when ready._

### Endpoints (baseline, same as v1)

- `POST /api/v2/upload-chunk.php` — FormData chunks
- `POST /api/v2/merge.php` — `{ fileName, totalChunks }`
- `GET /api/v2/list.php` — file name array
- `GET /api/v2/download.php?file=`
- `DELETE /api/v2/delete.php` — `{ fileName }`
- `PUT /api/v2/rename.php` — `{ oldName, newName }`
- `POST /api/v2/cancel.php` — `{ fileName }`
