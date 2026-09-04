# Versioning

Goal: an older UI (cached HTML/JS, or the frozen snapshot) must keep working when merge or other APIs change.

## Where version control lives

| Layer | Location | Role |
| --- | --- | --- |
| **API v1 (source of truth)** | `api/v1/*.php` | Real handlers. Edit here for v1 behavior. |
| **Root `*.php`** | `merge.php`, `list.php`, … | One-line aliases → `api/v1/`. For old URLs only. |
| **Shared libs** | `config.php`, `rate-limit.php`, `throttle.php`, `auth.php` | Not versioned. Used by every API version. |
| **UI snapshot** | `ui/v1/` | Frozen HTML/JS that calls `/api/v1/`. |
| **Latest UI** | `index.html`, `script.js`, `modules/` | Current UI; points at `/api/v1/` today. |

```
api/v1/merge.php     ← real merge logic (freeze this for v1)
merge.php            ← require api/v1/merge.php (legacy URL)
ui/v1/               ← frozen UI snapshot
```

When you ship **v2**, add `api/v2/merge.php` with the new contract. Leave `api/v1/merge.php` unchanged. Root aliases can stay on v1 or you drop them once nothing calls them.

## Current versions

- **API:** `v1` (implementation in `api/v1/`)
- **UI:** `1.1.1` (snapshot in `ui/v1/`)

## Freeze rule

1. **Never break v1.** `api/v1/merge.php` request/response shape stays the same.
2. **Breaking change → new folder.** Copy to `api/v2/`, document in `docs/api-v2.md`, snapshot UI to `ui/v2/`.
3. **Compatible fix on v1 is OK** (bugfix, extra JSON field). No field removals or renames.

## UI cache

Bump `APP_UI_VERSION` and `?v=` on `index.html` when you ship UI changes. The `ui/v1/` snapshot loads its own `modules/` so it never picks up latest JS by accident.
