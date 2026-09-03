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
| `/capabilities_statement.html` | `/assets/img/WIS_Capability_Statement.pdf` | 301 — **see below** |
| `/certifications_portfolio.html` | `/assets/img/WIS_Capability_Statement.pdf` | 301 — **see below** |
| `/assets/img/WIS_Capability_Statement.pdf` | *(unchanged — same key)* | — |

## There is no capabilities page

Capabilities and certifications are not a route on this site. They are the
two rows of the **Reps & Certs** disclosure in the header:

1. the capability statement (PDF), and
2. a link to SBA's certification search with the UEI beside it, ready to
   copy into that search.

That decision has a consequence worth stating plainly in the file that
implements it: **the two legacy capability URLs have no HTML page to land
on.** They are pointed at the PDF, which is the closest thing to what a
visitor following those links is actually looking for.

Redirecting an HTML URL to a PDF is legal and works, but it is unusual, and
it has two costs:

- **A crawler following `/capabilities_statement.html` gets a PDF.** Search
  engines do index PDFs, but weakly compared with HTML, and a PDF cannot
  carry the NAICS list, the UEI, or the certification claims as structured
  markup. The site therefore has no indexable capabilities content.
- **A visitor gets a file download rather than a page.** On mobile that is
  a worse landing experience than a short page with the same facts and a
  download link.

**The SBA certification profile links to `capabilities_statement.html`.**
That is an external, third-party reference this project does not control
and cannot update on its own schedule, so **this redirect is load-bearing**
and must survive any future URL revision.

If the capabilities route is ever reinstated, both rows above should point
at it instead, and the PDF becomes a download link on that page rather than
a redirect target.

## Also needed at M6, and not a redirect

The production distribution currently has no custom error responses, so a
missing key returns an AccessDenied XML document rather than the 404 page.
Directory-style URLs additionally need an index-rewrite function at the
edge, since the origin serves objects rather than directories.
