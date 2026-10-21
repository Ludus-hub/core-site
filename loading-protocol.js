/* Shared, low-overhead loading protocol for every non-game Ludus page. */
(() => {
  if (window.LUDUS_LOADING) return;
  const runWhenIdle = (work, timeout = 1200) => {
    if ('requestIdleCallback' in window) return requestIdleCallback(work, { timeout });
    return setTimeout(work, Math.min(timeout, 50));
  };
  const tune = (root = document) => {
    root.querySelectorAll?.('img:not([loading])').forEach((image) => {
      image.loading = image.closest('[data-ludus-eager]') ? 'eager' : 'lazy';
      image.decoding = 'async';
    });
    root.querySelectorAll?.('video[preload="auto"],audio[preload="auto"]').forEach((media) => {
      if (!media.closest('[data-ludus-eager]')) media.preload = 'metadata';
    });
  };
  window.LUDUS_LOADING = Object.freeze({ runWhenIdle, tune });
  const start = () => {
    tune();
    new MutationObserver((entries) => runWhenIdle(() => entries.forEach(({ addedNodes }) => addedNodes.forEach((node) => {
      if (node.nodeType === 1) tune(node);
    })))).observe(document.documentElement, { childList: true, subtree: true });
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start, { once: true }) : start();
})();
