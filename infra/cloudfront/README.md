# CloudFront Functions

Two `cloudfront-js-2.0` functions, created and published in WO-6, associated
with the distribution's default behaviour at M7 (see the M7 runbook in the
owner's harvest directory; never in this repo).

| File | Event | Does |
|---|---|---|
| `viewer-request.js` | viewer-request | apex → `www` (301); legacy `.html` paths from `docs/redirects.md` → new routes (301); `/dir/` → `/dir/index.html` rewrite; extension-less `/dir` → `/dir/` (301) |
| `viewer-response.js` | viewer-response | HSTS (1 y, includeSubDomains, no preload yet), CSP, nosniff, X-Frame-Options SAMEORIGIN, Referrer-Policy, Permissions-Policy, Cache-Control (immutable for `_astro/*`, 300 s for HTML, 1 d otherwise) |

## The CSP hash

`script-src` allows `'self'` plus one hash: the pre-paint theme script in
`src/layouts/BaseLayout.astro` (`is:inline`). Every other script is an
external file because `astro.config.mjs` sets `assetsInlineLimit: 0`.

If that inline script changes, recompute the hash from the built HTML and
republish the function:

```bash
python3 - <<'PY'
import re, hashlib, base64
m = re.search(r'<script>(.*?)</script>', open('dist/index.html').read(), re.S)
print('sha256-' + base64.b64encode(hashlib.sha256(m.group(1).encode()).digest()).decode())
PY
```

## Update + publish

```bash
ETAG=$(aws cloudfront describe-function --name wis-viewer-response --query ETag --output text)
aws cloudfront update-function --name wis-viewer-response --if-match "$ETAG" \
  --function-config '{"Comment":"wrightintel.net viewer-response","Runtime":"cloudfront-js-2.0"}' \
  --function-code fileb://infra/cloudfront/viewer-response.js
ETAG=$(aws cloudfront describe-function --name wis-viewer-response --query ETag --output text)
aws cloudfront publish-function --name wis-viewer-response --if-match "$ETAG"
```

Test before publishing with `aws cloudfront test-function --stage DEVELOPMENT`.
