// wis-viewer-request — CloudFront Function, viewer-request event (WO-6 §3.1).
//
// Three jobs, in order:
//   1. Canonical host: the apex redirects to www (301). The sitemap and every
//      canonical <link> say www; this makes the served surface agree.
//   2. Legacy URLs from the prior site → their new homes (301), per
//      docs/redirects.md. The SBA certification profile links to
//      capabilities_statement.html, so that one is load-bearing.
//   3. Directory-index rewrite: /path/ → /path/index.html, and /path →
//      /path/ (301) so a trailing-slash miss does not 403 at the REST origin.
//
// No identifiers. The function knows hostnames only.

var CANONICAL_HOST = 'www.wrightintel.net';

var REDIRECTS = {
  '/index.html': '/',
  '/wis_people.html': '/people/',
  '/contact.html': '/contact/',
  '/capabilities_statement.html': '/capabilities/',
  '/certifications_portfolio.html': '/capabilities/',
};

function redirect(location) {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: {
      location: { value: location },
      'cache-control': { value: 'max-age=3600' },
    },
  };
}

function handler(event) {
  var request = event.request;
  var host = request.headers.host ? request.headers.host.value : '';
  var uri = request.uri;

  // 1. Apex → www.
  if (host && host !== CANONICAL_HOST) {
    var qs = '';
    var keys = Object.keys(request.querystring);
    if (keys.length) {
      qs = '?' + keys.map(function (k) { return k + '=' + request.querystring[k].value; }).join('&');
    }
    return redirect('https://' + CANONICAL_HOST + uri + qs);
  }

  // 2. Legacy paths.
  if (REDIRECTS.hasOwnProperty(uri)) {
    return redirect('https://' + CANONICAL_HOST + REDIRECTS[uri]);
  }

  // 3. Directory index.
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
    return request;
  }
  var last = uri.split('/').pop();
  if (last.indexOf('.') === -1) {
    // Extension-less path: send the browser to the slashed form so relative
    // URLs and the canonical agree.
    return redirect('https://' + CANONICAL_HOST + uri + '/');
  }
  return request;
}
