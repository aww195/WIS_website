# Maintenance Log

Every change to the live site gets a row. Class is one of:
**content** · **structure** · **infrastructure** · **fix**.

| Date | Change | Class | By |
|---|---|---|---|
| 2026-09-04 02:11 UTC | **M7 cutover.** Distribution repointed from the prior site's bucket to `wrightintel-net-site-prod`; edge functions `wis-viewer-request` / `wis-viewer-response` associated; 403/404 → `/404.html`; WAF `wis-web-acl` attached; HTTP/3 enabled. Site = tag `m6` build. Live-site change freeze (28 Aug) lifted. | structure | Tony Wright |
| 2026-09-17 20:33 UTC | **WO-9 name sync.** Tony's published name → `Anthony Wayne (Tony) Wright` on every rendered surface (roster, People dropdown, person-page H1, title/description/OG, portrait alt, résumé view); JSON-LD `Person.name` updated, `alternateName: "Tony Wright"` added; personal LinkedIn URL → `linkedin.com/in/aww195`. Routes, sitemap, titles, PDF unchanged. Evidence: `harvest/wo9_before/`, `wo9_after/`, `wo9_verify/`. | content | Tony Wright |
