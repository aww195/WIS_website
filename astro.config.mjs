// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Canonical production origin. Drives absolute URLs in the sitemap and
  // the <link rel="canonical"> emitted by BaseLayout. The www host is
  // canonical for this site (both apex and www are served).
  site: 'https://www.wrightintel.net',

  // Directory-style URLs: /people/ not /people.html. The old-URL map in
  // docs/redirects.md translates the legacy .html paths.
  trailingSlash: 'always',

  // Static output — the site is served from object storage behind a CDN.
  output: 'static',

  integrations: [
    sitemap({
      // Keep the error page and the two PDF-view routes out of the index.
      // The PDF-view pages are noindex (WO-4 §3): their parent HTML pages
      // are the indexable surface.
      filter: (page) =>
        !page.endsWith('/404/') &&
        !page.endsWith('/404') &&
        !page.endsWith('/capabilities/pdf/') &&
        !page.endsWith('/people/tony-wright/resume/'),
    }),
  ],
});
