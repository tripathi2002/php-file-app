# Changelog

## 1.1.0 (UI) / API v1

- Introduced API version `v1` at `/api/v1/` while keeping root PHP endpoints as aliases for older UIs.
- Froze the current UI under `ui/v1/` so later merge/API changes can ship as v2 without breaking this snapshot.
- Added `docs/` and `GET /version.php`.
- Cache-bust UI assets with `?v=1.1.0`.
