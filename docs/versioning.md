# Versioning

Goal: an older UI (cached HTML/JS, or the frozen snapshot) must keep working when merge or other APIs change.

## Where version control lives

| Layer | Location | Role |
| --- | --- | --- |
| **API v1 (frozen)** | `api/v1/*.php` | v1 handlers — do not break |
| **API v2 (active)** | `api/v2/*.php` | Current development line |
| **Root `*.php`** | `merge.php`, `list.php`, … | Legacy aliases → `api/v1/` |
| **Shared libs** | `config.php`, `rate-limit.php`, … | Not versioned |
| **UI v1 (frozen)** | `ui/v1/` | Old UI → `/api/v1/` |
| **UI v2 (active)** | `ui/v2/` + root `index.html`, `modules/` | Current UI → `/api/v2/` |

```
api/v1/merge.php     frozen v1
api/v2/merge.php     edit here for v2
merge.php            legacy alias → v1
/                    latest UI → v2
/ui/v1/              frozen v1 UI
/ui/v2/              v2 UI workspace
```

## Current versions

- **Latest API:** `v2` (`api/v2/`)
- **Latest UI:** `2.0.0` (root + `ui/v2/`)
- **Frozen:** API/UI `v1` in `api/v1/` and `ui/v1/`

Each API folder has `bootstrap.php` that sets `APP_API_VERSION` before `config.php` runs.

## Freeze rule

1. **Never break v1** once shipped.
2. **Breaking change → new version folder** (`api/v3/`, `ui/v3/`).
3. **Compatible fix on old version** only if old clients can ignore new fields.

## UI cache

Bump `APP_UI_VERSION` and `?v=` when shipping UI changes. Frozen `ui/vN/` folders load their own `modules/`.
