# Hosting under WordPress (vibhu.pro)

`file-app` lives in a folder next to WordPress (`public_html/file-app/`). The **site root** `.htaccess` is WordPress + LiteSpeed Cache. Do not edit the `BEGIN LSCACHE` / `BEGIN WordPress` / Wordfence blocks. Add a small passthrough **above** `# BEGIN WordPress` (above `# BEGIN LSCACHE` is even better so LiteSpeed does not cache API 404s).

## Root `public_html/.htaccess` (add this yourself)

Paste this as a new block. Do not put it inside the generated WordPress or LiteSpeed sections.

```apache
# BEGIN file-app
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteRule ^file-app/ - [L]
</IfModule>
# END file-app
```

That stops WordPress from sending `/file-app/api/v1/list.php` to `/index.php` when LiteSpeed thinks the file is missing, or after our own old `/api/` rewrite turned it into a non-existent path.

Then **purge LiteSpeed cache** (LiteSpeed Cache → Purge All). An earlier 404 can stay cached.

## What went wrong

1. WordPress catch-all: if the request is not an existing file, it becomes `index.php` → a WordPress 404.
2. This app used `RewriteBase /files-app/` (wrong folder name) and `RewriteRule ^api/(.*)$ $1.php`, which can turn `/api/v1/list.php` into a path that does not exist, so WordPress takes over.
3. Root LiteSpeed `CacheLookup on` can cache that 404.

Root `/file-app/list.php` and `/file-app/version.php` kept working because they are real files at the app root and never hit the `/api/` rewrite.

## After deploy

- `GET https://vibhu.pro/file-app/api/v1/list.php` should return the JSON file list (same as `/file-app/list.php`).
- `GET https://vibhu.pro/file-app/api/v1/version.php` should return `{"api":"v1",...}`.
