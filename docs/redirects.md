# Old-URL map

Input for the M6 CloudFront Function that redirects legacy URLs. The prior
site was a flat set of `.html` files at the root; this one uses
directory-style paths (`trailingSlash: 'always'`).

Every legacy URL below is a real path from the prior site, taken from its
sitemap and its internal navigation.

| Old | New | Status |
|---|---|---|
| `/index.html` | `/` | 301 |
| `/capabilities_statement.html` | `/capabilities/` | 301 |
| `/certifications_portfolio.html` | `/capabilities/` | 301 |
| `/wis_people.html` | `/people/` | 301 |
| `/contact.html` | `/contact/` | 301 |
| `/assets/img/WIS_Capability_Statement.pdf` | *(unchanged — same key)* | — |

## Notes

**`/certifications_portfolio.html` folds into `/capabilities/`.** There is
no `/certifications/` route; the two pages were merged on 3 Sep. The
redirect is what keeps the retired URL from 404ing.

**The capability-statement PDF keeps its exact key.** It is published at
`/assets/img/WIS_Capability_Statement.pdf` on the current live site and
stays at that path here, so any copy of the URL already in circulation
keeps working across the cutover with no redirect needed.

**The SBA certification profile links to `capabilities_statement.html`.**
That is an external, third-party reference this project does not control
and cannot update on its own schedule, so **that redirect is load-bearing**
and must survive any future URL revision.

**Also needed at M6, and not a redirect:** the production distribution
currently has no custom error responses, so a missing key returns an
AccessDenied XML document rather than the 404 page. Directory-style URLs
additionally need an index-rewrite function at the edge, since the origin
serves objects rather than directories.
