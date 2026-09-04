# Changelog

## 1.1.2 (API layout)

- Move real endpoint logic into `api/v1/`; root `*.php` files are one-line aliases only.
- Remove `api/v1/_dispatch.php` indirection.

## 1.1.1 (UI)

- Stop rewriting `/api/v1/*.php` (that collided with WordPress at the domain root).
- Correct `RewriteBase` to `/file-app/`, turn off LiteSpeed cache lookup in this folder, and fall back to root endpoints if a versioned URL 404s.

## 1.1.0 (UI) / API v1

- Introduced API version `v1` at `/api/v1/` while keeping root PHP endpoints as aliases for older UIs.
- Froze the current UI under `ui/v1/` so later merge/API changes can ship as v2 without breaking this snapshot.
- Added `docs/` and `GET /version.php`.
- Cache-bust UI assets with `?v=1.1.0`.
