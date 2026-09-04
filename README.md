# wrightintel.net

The public website for Wright Intel Solutions, LLC — a woman-owned small
business of former Intelligence Community senior executives who advise
clients on engagements with US government agencies and on bringing
innovative concepts to government and commercial markets.

## Stack

- [Astro](https://astro.build) — static output, directory-style URLs
- Tailwind CSS, with every colour resolved through CSS custom properties
- Self-hosted fonts via `@fontsource` (Source Serif 4, IBM Plex Sans, IBM Plex Mono)
- `@astrojs/sitemap`

Node version is pinned in `.nvmrc`.

## Local development

```sh
npm install
npm run dev      # local dev server
npm run build    # static build into dist/
npm run preview  # serve the built output
npm run preflight  # repository hygiene gate — see below
```

## Repository rules

These are not style preferences. This repository is public and its history
is permanent.

1. **No infrastructure identifiers.** No account numbers, distribution IDs,
   bucket names, hosted-zone IDs, API IDs, or access keys — in code,
   comments, docs, or commit messages. Infrastructure is referred to by
   role, never by identifier.
2. **No predecessor-brand content**, and no third party's name, email
   address, or contact details.
3. **Run `npm run preflight` before every commit.** It greps the working
   tree for the strings above and exits non-zero on a hit. A commit that
   fails the gate is not made.

## Deployment

Documented at M7. Nothing in this repository deploys itself, and no
deployment credentials or resource identifiers live here.

## Change log

See [MAINTENANCE_LOG.md](./MAINTENANCE_LOG.md).


## Deploy

The site is static output served from an object-store bucket behind a CDN
distribution with two edge functions (`infra/cloudfront/`). Resource
identifiers are never written here; set them in the shell for the session.

```bash
export DIST_ID=...                       # the distribution serving wrightintel.net
export SITE_BUCKET=wrightintel-net-site-prod
```

Every release is three steps:

```bash
# 1. Build from a clean main. .env must carry the production PUBLIC_CONTACT_ENDPOINT.
git checkout main && git pull --ff-only
npm ci && npm run build
bash scripts/preflight.sh
grep -rl localhost dist && echo "STOP" || echo "dist clean"

# 2. Publish. --delete removes objects that are no longer in dist/.
aws s3 sync dist/ "s3://$SITE_BUCKET" --delete --only-show-errors

# 3. Invalidate. HTML is cached 300 s at the edge; hashed assets are immutable.
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths '/*'
```

Then check `https://www.wrightintel.net/` and one deep route in a browser.

**If `src/layouts/BaseLayout.astro`'s inline theme script changes**, the
Content-Security-Policy hash in `infra/cloudfront/viewer-response.js` must be
recomputed and the function republished *before* the sync — see
`infra/cloudfront/README.md`. Every other script is an external file and
needs nothing.

The distribution itself (origin, function associations, error responses,
WAF, HTTP/3) was configured once, at the M7 cutover on 4 Sep 2026, and is not
part of a release. Changing it is a deliberate, logged event — see
`MAINTENANCE_LOG.md`.
