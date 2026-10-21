/*
 * Ludus relay servers. Add or remove one URL here; active apps on both sites
 * read this file, so their Server 1–4 order always remains identical.
 */
(() => {
  const urls = [
    'https://u6dhtt3vfobb.shares.zrok.io/resolve',
    'https://recipe-robots-bowl-brick.trycloudflare.com/resolve',
    'https://ncfz2uaj73u9.shares.zrok.io/resolve',
    'https://a3zgc7ce703v.shares.zrok.io/resolve'
  ];

  const resolvers = urls.map((url, index) => Object.freeze({
    id: `server-${index + 1}`,
    label: `Server ${index + 1}`,
    url
  }));
  const normalize = (url) => String(url || '').replace(/\/+$/, '');

  window.LUDUS_RESOLVERS = Object.freeze(resolvers);
  window.LUDUS_RESOLVER_URLS = Object.freeze(resolvers.map(({ url }) => url));
  window.LUDUS_RESOLVER_URL = window.LUDUS_RESOLVER_URLS[0];
  window.ludusResolverInfo = (url) => resolvers.find((item) => normalize(item.url) === normalize(url)) || null;

  // The inspector is developer-only and injected here so every active app gets
  // the identical, source-of-truth server identity map.
  const isDeveloper = () => {
    try {
      return localStorage.getItem('ludus_is_developer') === 'true'
        || sessionStorage.getItem('ludus_is_developer') === 'true'
        || (localStorage.getItem('mathmaster_dev') === 'true'
          && sessionStorage.getItem('mathmaster_dev_unlocked') === 'true');
    } catch (_) {
      return false;
    }
  };
  const activeResolver = () => {
    try {
      return normalize(localStorage.getItem('ludus_active_resolver') || window.LUDUS_RESOLVER_URL);
    } catch (_) {
      return normalize(window.LUDUS_RESOLVER_URL);
    }
  };
  const updateInspector = (panel) => {
    const active = activeResolver();
    const rows = panel.querySelector('.ludus-resolver-inspector__rows');
    rows.replaceChildren(...resolvers.map((resolver) => {
      const row = document.createElement('div');
      row.className = 'ludus-resolver-inspector__row';
      const hostname = new URL(resolver.url).hostname;
      const current = normalize(resolver.url) === active;
      row.innerHTML = `<strong>${resolver.label}${current ? ' · Active' : ''}</strong><span>${hostname}</span><code></code>`;
      row.querySelector('code').textContent = resolver.url;
      return row;
    }));
  };
  const mountInspector = () => {
    // The root page owns this fixed panel. Resolver apps run inside iframes,
    // so mounting there as well produced stacked duplicate developer maps.
    if (window.top !== window || !isDeveloper() || document.getElementById('ludus-resolver-inspector')) return;
    const style = document.createElement('style');
    style.textContent = `#ludus-resolver-inspector{position:fixed;right:12px;bottom:12px;z-index:2147483647;max-width:min(430px,calc(100vw - 24px));padding:8px 10px;color:#dbeafe;background:#07111fef;border:1px solid #1e40af;border-radius:10px;font:12px/1.35 system-ui,sans-serif;box-shadow:0 8px 30px #0008}#ludus-resolver-inspector summary{cursor:pointer;color:#93c5fd;font-weight:700}.ludus-resolver-inspector__rows{display:grid;gap:7px;margin-top:9px}.ludus-resolver-inspector__row{display:grid;gap:1px;padding-top:6px;border-top:1px solid #1e3a5f}.ludus-resolver-inspector__row span{color:#bfdbfe}.ludus-resolver-inspector__row code{overflow-wrap:anywhere;color:#94a3b8;font:11px/1.25 ui-monospace,monospace}`;
    const panel = document.createElement('details');
    panel.id = 'ludus-resolver-inspector';
    panel.innerHTML = '<summary>Developer server map</summary><div class="ludus-resolver-inspector__rows"></div>';
    panel.addEventListener('toggle', () => updateInspector(panel));
    document.head.append(style);
    document.body.append(panel);
    updateInspector(panel);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountInspector, { once: true });
  else mountInspector();
})();
