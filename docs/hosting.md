# Hosting files: Apache rules and a service worker

Both files in `src/hosting/` come from the company-site prototype, which was never deployed. They are kept as documented example files with that label in their headers. Nothing in this repository registers the service worker or runs the Apache rules; they are read, not executed.

## htaccess.example

The blocks, in the order they appear:

1. Security headers: `nosniff`, `X-Frame-Options: DENY`, a referrer policy, HSTS with preload, a permissions policy, and a Content-Security-Policy. The CSP lists two analytics hosts and the Google Fonts hosts because the prototype used them; cut the entries the site does not need. `'unsafe-inline'` is there for inline scripts in the old markup, a nonce-based policy is the better default for new pages.
2. Compression with `mod_deflate`, and `mod_brotli` where the host has it. Already-compressed formats are excluded so the server does not spend CPU for nothing.
3. Browser caching with `mod_expires`: HTML always fresh, CSS and JS a month, images and fonts a year. Per-asset `Cache-Control` headers in block 1 override these when both apply.
4. Rewrites: HTTPS redirect, optional `www` normalisation, trailing-slash removal, and clean URLs that map `/services` to `services.html`. Behind a proxy that terminates TLS, test on `X-Forwarded-Proto` instead of `HTTPS`.
5. Error pages, a deny list for config and log files, no directory listing, UTF-8 by default, and a redirect that removes `index.html` from URLs.

Copy it to `.htaccess` at the web root and test every redirect with `curl -I` before relying on it; a loop in block 4 locks the site.

## sw.js

The worker pre-caches a short list of assets on install, then answers every same-origin GET network-first: a successful response is cloned into the cache on the way through, and when the network fails the cached copy is served, then `/offline.html`. POST requests and cross-origin requests are not handled. `CACHE_NAME` is the version: bump it on every deploy that changes a pre-cached file, and the activate handler deletes the older caches.

Register it from the page with `navigator.serviceWorker.register("/sw.js")` and keep the pre-cache list to what the first screen needs; the visitor pays for those bytes on the first visit.
