# File spaces — full scenario matrix

Run automated checks on the server:

```bash
cd ~/public_html/sit/file-app   # or file-app
php tests/negative-flow.php
```

---

## What people do most (priority)

1. Enter public space (no login) or personal (mobile + PIN)
2. Upload a file
3. Open / download later
4. Create a folder and upload into it
5. Switch Public ↔ Personal tabs; logout on a shared phone

---

## Public space

| # | Scenario | Expected |
|---|----------|----------|
| P1 | Landing → Enter public space | File list; no login |
| P2 | Upload / mkdir / rename / delete in public | Works with `X-Space: public` |
| P3 | Open signed download link | Works with `uid=public` |
| P4 | Tab → Personal without session | Shows mobile + PIN form |
| P5 | Tab → Public while logged in | Public list; personal session kept |
| P6 | List/upload without space header (default) | Treated as personal → 401 if no session |
| P7 | FAB upload in public | Opens upload sheet (no login gate) |
| P8 | `PUBLIC_READONLY=1` | Mutates → 403; UI hides fab/new folder |
| P9 | Multi-select zip in public | Downloads zip of selected files |

## UI power features

| # | Scenario | Expected |
|---|----------|----------|
| X1 | Search `/` | Filters current folder |
| X2 | Sort / type chips / favorites | List updates client-side |
| X3 | Preview image/pdf/text | In-app overlay; ← → navigates |
| X4 | Move / duplicate / copy link | Works; activity log updates |
| X5 | Theme button | Cycles system/light/dark |
| X6 | Grid toggle | Switches layout |
| X7 | Pull-down on mobile | Refresh toast |
| X8 | Deep search | Finds across folders |
| X9 | Trash file then restore | File returns |
| X10 | Shift+click range select | Contiguous selection |
| X11 | More → Largest / Newest | Insight modals |
| X12 | Upload existing name | Overwrite or keep both before chunks |
| X13 | Idle 30m in personal | Auto logout |
| X14 | Ctrl+L | Copies current folder path |

---

## Auth — positive

| # | Scenario | Expected |
|---|----------|----------|
| A1 | New mobile + valid PIN → Enter | Space created, file list shown |
| A2 | Same mobile + same PIN again | Welcome back, same files |
| A3 | Account → Leave / Logout | Login screen; local session cleared |
| A4 | Re-enter after logout | Files still there |
| A5 | Mobile with spaces/`+91` | Normalized; works |
| A6 | Two phones, same mobile | Both can enter; same private files |

## Auth — negative

| # | Scenario | Expected |
|---|----------|----------|
| A10 | Mobile `123` / empty | Error: 10–15 digits |
| A11 | PIN `12` / `abcdef` / empty | Error: 4–6 digits |
| A12 | Correct mobile, wrong PIN | Wrong PIN |
| A13 | Register again for existing mobile | Already has a space |
| A14 | Call list/upload with no session | 401 → login gate |
| A15 | Fake Bearer token | 401 |
| A16 | Expired session file | Treated as logged out |
| A17 | Spam login (>10/min) | 429 Too many requests |
| A18 | Forgot PIN | No reset (must remember) — document for users |

---

## Folders — positive

| # | Scenario | Expected |
|---|----------|----------|
| F1 | New folder `photos` | Appears in list |
| F2 | Open folder → breadcrumb | Path updates |
| F3 | Upload inside folder | File only in that folder |
| F4 | Nested folder under `photos` | Works up to 5 levels |
| F5 | Rename empty folder | Name updates |
| F6 | Delete empty folder | Removed |
| F7 | Crumb back to My space | Root listing |

## Folders — negative

| # | Scenario | Expected |
|---|----------|----------|
| F10 | Folder name `a.b` / `photos.bak` | Cannot contain a dot |
| F11 | Folder name `..` / empty | Rejected |
| F12 | Create under missing parent | Parent folder not found |
| F13 | Duplicate folder name | Already exists |
| F14 | Delete folder with files inside | Folder is not empty |
| F15 | Path `../../../etc` | Sanitized; no escape |
| F16 | Deeper than 5 levels | Rejected / capped |
| F17 | Upload into missing folder path | Folder not found |

---

## Files / upload — positive

| # | Scenario | Expected |
|---|----------|----------|
| U1 | Upload jpg/png/pdf | Listed with size/date |
| U2 | Pause → Resume | Continues |
| U3 | Cancel mid-upload | Chunks cleaned; no partial file |
| U4 | Overwrite confirm on same name | 409 then overwrite works |
| U5 | View / Download | Opens via signed URL |

## Files / upload — negative

| # | Scenario | Expected |
|---|----------|----------|
| U10 | `.php` / `.php.txt` / `.html.txt` | Invalid file type |
| U11 | No extension | Rejected |
| U12 | File over 50MB | 413 + UI message |
| U13 | Quota exceeded | 413 storage quota |
| U14 | Chunk index `-1` / `abc` | Invalid request |
| U15 | Merge with missing chunk | Missing chunk N |
| U16 | Merge without session | 401 |
| U17 | Rename to existing name | Name already exists |
| U18 | Delete missing file | File not found |
| U19 | Wrong HTTP method on delete | 405 |

---

## Security / isolation — negative

| # | Scenario | Expected |
|---|----------|----------|
| S1 | User B opens User A download URL (no/invalid sig) | 401 |
| S2 | Tamper `sig` or `uid` in URL | 401 |
| S3 | Expired signed link | 401 |
| S4 | Direct `/storage/...` or `/uploads/...` URL | 403 Forbidden |
| S5 | Web hit `config.php` / `helpers.php` / root `auth.php` | 403 |
| S6 | Web hit old `api/v1/auth.php` name | 403/404 (use `session.php`) |
| S7 | XSS filename in list | Shown as text only (no script run) |
| S8 | `file` query `../secret` | File not found |

---

## UI — negative

| # | Scenario | Expected |
|---|----------|----------|
| X1 | Open app logged out | Login gate blocks app |
| X2 | Submit login with empty fields | Browser/HTML5 validation |
| X3 | Upload controls with no file | Buttons disabled |
| X4 | Escape on modal | Closes modal |
| X5 | Stale tab after logout elsewhere | Next API call → login gate |

---

## Fixes applied from this pass

- Upload/merge into a **non-existent folder** → `404 Folder not found` (no silent mkdir)
- **Parent must exist** before creating a child folder
- Folder **depth capped** at 5 levels
- Login API is **`session.php`** (not `auth.php`) so `.htaccess` does not 403 it
