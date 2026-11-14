# Changelog

## 1.2.0 (security + UX)

- Access-key auth: auto-enables after `php generate-key.php`; UI **Key** button stores the token.
- Upload sessions use random `uploadId` (no same-name chunk collisions); resume via `status.php`.
- Harden APIs: sanitize chunk index / filenames, extension checks, JSON errors + HTTP status codes.
- Block web access to `chunks/`, `tokens/`, `throttle/`, `rate_limit/`, and direct `/uploads/` (use `download.php`).
- Rate limit uses file locking; directories created as `0755`.
- UI: relative server base, XSS-safe file list, toast errors, health banner, overwrite confirm on merge.
- Removed unused GitHub Pages workflow; Hostinger deploy via lftp.

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
