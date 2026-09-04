# Versioning

Goal: an older UI (cached HTML/JS, or the frozen snapshot) must keep working when merge or other APIs change.

## Current versions

- **API:** `v1`
- **UI:** `1.1.0` (snapshot path `ui/v1/`)

Constants live in [`config.php`](../config.php) (`APP_API_VERSION`, `APP_UI_VERSION`) and [`script.js`](../script.js).

## Layout

```
api/v1/*.php     versioned API (same contract as root *.php)
merge.php        unversioned alias — older UIs that POST here still work
ui/v1/           frozen copy of the UI that talks to api/v1
docs/            this documentation
GET /version.php JSON: api, ui, uiPath
```

Root endpoints (`/merge.php`, `/upload-chunk.php`, …) stay as **v1 aliases**. Do not change their request or response shape.

## Freeze rule

1. **Never break v1.** If an older `script.js` still calls `POST /merge.php` with `{ fileName, totalChunks }`, that must succeed.
2. **Breaking change → new version.** Copy the new merge handler to `api/v2/merge.php` (and a new UI under `ui/v2/` that calls `/api/v2/`). Leave `merge.php` and `api/v1/merge.php` alone.
3. **Compatible change is OK on v1** (bugfix, extra JSON field the old UI ignores). Removing or renaming fields is not OK.

## UI cache

`index.html` loads `script.js?v=1.1.0` and modules with the same query. Bump `APP_UI_VERSION` and the `?v=` query when you ship UI changes on the latest page.

The snapshot at `ui/v1/` must keep loading **its own** `modules/` files, not the latest root modules. That is how a previous UI cannot pick up a new merge client by accident.

## Shipping v2 (later)

1. Document the new contract in `docs/api-v2.md`.
2. Add `api/v2/` handlers. Do not reuse v1 merge if the body or response changed.
3. Snapshot UI to `ui/v2/` with `API_BASE` pointing at `/api/v2`.
4. Point the latest `index.html` at v2. Keep `ui/v1/` and `/api/v1/` (and root aliases) running.
