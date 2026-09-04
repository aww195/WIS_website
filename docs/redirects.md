# Old-URL map

Input for the M6 CloudFront Function that redirects legacy URLs. The prior
site was a flat set of `.html` files at the root; this one uses
directory-style paths (`trailingSlash: 'always'`).

Every legacy URL below is a real path from the prior site, taken from its
sitemap and its internal navigation.

| Old | New | Status |
|---|---|---|
| `/index.html` | `/` | 301 |
| `/wis_people.html` | `/people/` | 301 |
| `/contact.html` | `/contact/` | 301 |
| `/capabilities_statement.html` | `/capabilities/` | 301 — **load-bearing, see below** |
| `/certifications_portfolio.html` | `/capabilities/` | 301 |
| `/assets/img/WIS_Capability_Statement.pdf` | *(unchanged — same key)* | — |

## The capabilities page is back (WO-4, 3 Sep 2026)

`/capabilities/` is an HTML page again: the capability statement authored as
markup (company data, UEI, WOSB, competencies, NAICS), with a DOWNLOAD
button to `/capabilities/pdf/`, which frames the PDF. The two legacy
capability URLs therefore redirect to a page, not a file — the M3 concern
about sending a crawler or a phone straight to a PDF no longer applies.

**The SBA certification profile links to `capabilities_statement.html`.**
That is an external, third-party reference this project does not control
and cannot update on its own schedule, so **this redirect is load-bearing**
and must survive any future URL revision.

The PDF's key is unchanged so that any bookmark or third-party link to the
file keeps resolving. `/capabilities/pdf/` and `/people/tony-wright/resume/`
are `noindex` and excluded from the sitemap; the parent HTML pages are the
indexable surface.

## Also needed at M6, and not a redirect

The production distribution currently has no custom error responses, so a
missing key returns an AccessDenied XML document rather than the 404 page.
Directory-style URLs additionally need an index-rewrite function at the
edge, since the origin serves objects rather than directories.
