// zrok media support for the Google-site static deployment.
// The resolver permits this documented opt-out header in its CORS policy. It
// lets audio/video requests receive resolver data rather than the zrok share
// information page; browser certificate and navigation protections remain in
// effect.
const ZROK_SKIP_HEADER = 'skip_zrok_interstitial';

function isZrokRequest(url) {
  try { return new URL(url).hostname.toLowerCase().endsWith('.zrok.io'); }
  catch { return false; }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (!isZrokRequest(request.url) || request.mode === 'navigate' || !['GET', 'HEAD'].includes(request.method)) return;
  const headers = new Headers(request.headers);
  headers.set(ZROK_SKIP_HEADER, '1');
  event.respondWith(fetch(new Request(request, { headers, mode: 'cors', credentials: 'omit' })));
});
