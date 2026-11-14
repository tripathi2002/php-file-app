# File Spaces

Shared **public** space (no login) and private **personal** spaces (mobile + PIN) on shared hosting.

**Current versions:** API `v1` · UI `1.7.0`

---

## How people use it

1. Open the app  
2. Choose **Enter public space** (anyone) **or** **Enter personal space**  
3. Personal: mobile number + 4–6 digit PIN (first time creates the space)  
4. Upload, preview, organize, zip, and share  
5. Switch with **Public / Personal** tabs, or **Account** to leave  

Public files: `storage/public/`. Personal: `storage/users/<id>/`.

---

## Features (1.7)

- Upload whole folders (keeps relative structure)  
- Empty current folder, compact density, sticky multi-select bar  
- Preview next/prev (arrows + swipe)  
- Folder picker select for move  

## Features (1.6)

- Public + personal spaces, last-folder memory per space  
- Folders (depth ≤ 5), move, rename, delete, duplicate  
- Multi-select: batch move / delete / zip download  
- Chunked multi-file upload queue (pause / resume / cancel)  
- In-app preview (image, video, audio, PDF, text)  
- Search, sort, type chips, favorites, list/grid view  
- Copy / share links (Web Share when available)  
- Theme: system / light / dark  
- Activity log + recent files (device-local)  
- Quota + space stats, pull-to-refresh, offline banner  
- New note + in-preview text edit (txt/md/csv/json)  
- Paste images / drop files onto the list to upload  
- Recursive folder delete (with confirm)  
- Keyboard: `/` search · `U` upload · `N` folder · `T` note · `R` refresh  
- Optional public read-only: env `PUBLIC_READONLY=1`  
- Signed short-lived download URLs, private storage  

---

## Setup

1. Deploy under `/file-app` or SIT `sit/file-app`  
2. Ensure `storage/` is writable  
3. WordPress passthrough — [docs/hosting-wordpress.md](docs/hosting-wordpress.md)  

Optional env: `STORAGE_PATH`, `MAX_UPLOAD_BYTES`, `STORAGE_QUOTA_BYTES`, `APP_SIGNING_SECRET`, `PUBLIC_READONLY`, `CORS_ALLOWED_ORIGINS`.

---

## Health

`GET /api/v1/health.php` — includes public storage + ZipArchive checks.
