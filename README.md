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
