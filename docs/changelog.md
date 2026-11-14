# Changelog

## 1.3.0 (lockdown + private storage)

- Access key is always required; if none exists on the server, APIs return 503 until `php generate-key.php`.
- Files stored under private `storage/` (not web-reachable); legacy `/uploads/` denied.
- View/Download use short-lived signed URLs (no access key in the query string).
- Block dangerous double extensions; expand allowed types (mp3, pptx, …); 413 on oversize / quota.
- Security headers (CSP, frame deny, referrer, HSTS); `list.php` is `no-store`; rate-limit headers.
- UI: size/date/type/thumbnails, quota bar, modal a11y, upload controls, accept filter, single `app.js` bundle, noindex, tiny SVG favicon.
- SIT deploy writes `robots.txt` disallowing `/sit/`.

## 1.2.0 (security + UX)

- Access-key auth scaffold, upload sessions, resume status API, XSS-safe list, health banner.

## 1.1.2 (API layout)

- Move real endpoint logic into `api/v1/`; root `*.php` files are one-line aliases only.

## 1.1.1 (UI)

- Stop rewriting `/api/v1/*.php` under WordPress; fix RewriteBase.

## 1.1.0 (UI) / API v1

- Introduced API version `v1` and `ui/v1/` snapshot.
