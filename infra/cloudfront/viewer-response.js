// wis-viewer-response — CloudFront Function, viewer-response event (WO-6 §3.1).
//
// Security headers (NFR-3) and cache-control. The CSP is deliberately
// tight: Astro's component scripts are external hashed files (see
// astro.config.mjs), so script-src is 'self' plus ONE hash — the pre-paint
// theme resolver that BaseLayout marks is:inline. If that script changes,
// the hash changes; the build prints it (see docs/m7 runbook).
//
// connect-src carries the contact endpoint host (a public API Gateway URL,
// not an account identifier). frame-src 'self' is for the PDF-view routes.
// If Turnstile is ever armed, script-src and frame-src need
// https://challenges.cloudflare.com — noted in docs/contact-runbook.md, not
// added now.

var CSP = [
  "default-src 'self'",
  "script-src 'self' 'sha256-Ff+x2GiQyIfdjm2Jh3EAGUiCVRLwWasg8BP9nEdB4mM='",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "media-src 'self'",
  "connect-src 'self' https://m7viwfazg2.execute-api.us-east-1.amazonaws.com",
  "frame-src 'self'",
  "object-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  'upgrade-insecure-requests',
].join('; ');

function handler(event) {
  var response = event.response;
  var headers = response.headers;
  var uri = event.request.uri;

  headers['strict-transport-security'] = { value: 'max-age=31536000; includeSubDomains' };
  headers['content-security-policy'] = { value: CSP };
  headers['x-content-type-options'] = { value: 'nosniff' };
  headers['x-frame-options'] = { value: 'SAMEORIGIN' };
  headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
  headers['permissions-policy'] = { value: 'camera=(), microphone=(), geolocation=()' };

  // Cache: hashed build assets are immutable; HTML is short-lived so a
  // deploy shows within minutes even without an invalidation.
  if (uri.indexOf('/_astro/') === 0) {
    headers['cache-control'] = { value: 'public, max-age=31536000, immutable' };
  } else if (uri.endsWith('.html') || uri.endsWith('/')) {
    headers['cache-control'] = { value: 'public, max-age=300' };
  } else if (!headers['cache-control']) {
    headers['cache-control'] = { value: 'public, max-age=86400' };
  }
  return response;
}
