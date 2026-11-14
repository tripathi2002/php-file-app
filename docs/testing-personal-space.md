# Personal space — positive & negative checks

## What people do most

1. Enter with mobile + PIN  
2. Upload a photo/PDF  
3. Open / download it later  
4. Make a folder and upload into it  
5. Logout on a shared phone  

Test those paths first.

## Positive

| Step | Expect |
|------|--------|
| New mobile + PIN → Enter | Space created, file list loads |
| Same mobile + same PIN again | Welcome back, same files |
| Upload image in root | Appears in list with thumb |
| New folder → open it → upload | File only in that folder |
| Breadcrumb back to My space | Root listing |
| View / Download | Opens / downloads (signed URL) |
| Rename file / folder | Name updates |
| Delete empty folder | Removed |
| Account → Leave / Logout | Login screen; list locked |
| Re-enter after logout | Files still there |

## Negative

| Step | Expect |
|------|--------|
| Mobile `123` | Error: valid 10–15 digits |
| PIN `12` | Error: 4–6 digits |
| Wrong PIN | Wrong PIN |
| Existing mobile via “first time” only | “already has a space” if forced register |
| Delete non-empty folder | Folder is not empty |
| Folder name `photos.backup` | Folder name cannot contain a dot |
| Upload `.php.txt` / exe | Invalid file type |
| Oversized file | 413 / UI message |
| Call list/upload without session | 401 → login gate |
| Path `../` in folder | Sanitized / ignored |
| Another user’s uid in download URL | Signature fail / 401 |

## Device quirks

- Logout clears this browser only (session token in localStorage)  
- Same mobile on two phones = two sessions, same files  
- Forgot PIN: no reset yet (by design for v1.4) — user must remember PIN  
