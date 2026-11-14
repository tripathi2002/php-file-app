# Personal File Space

Private file areas on shared hosting. Each person enters with **mobile number + PIN** — no CLI keys to copy around.

**Current versions:** API `v1` · UI `1.4.0`

---

## How people use it

1. Open the app  
2. Enter mobile number + 4–6 digit PIN  
3. First time → personal space is created automatically  
4. Upload files, create folders, view / download / rename / delete  
5. **Account** → **Leave / Logout** to clear the session on this device  

Each mobile number gets an isolated private folder under `storage/users/`.

---

## Features

- Personal space (mobile + PIN), easy logout  
- Folders (create, open, rename, delete when empty)  
- Chunked upload with pause / resume / cancel  
- Signed short-lived view/download links  
- Quota bar, type allowlist, private storage  

---

## Setup

1. Deploy under `/file-app` or SIT `sit/file-app`  
2. Ensure `storage/` is writable  
3. Add WordPress passthrough if needed — see [docs/hosting-wordpress.md](docs/hosting-wordpress.md)  

No access-key generation step for normal use.

Optional env: `STORAGE_PATH`, `MAX_UPLOAD_BYTES`, `STORAGE_QUOTA_BYTES`, `APP_SIGNING_SECRET`.

---

## Health

`GET /api/v1/health.php`
