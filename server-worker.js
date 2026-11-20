const ALLOWED = ["/resolve", "/search", "/mix", "/lyrics", "/credits", "/health"];

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
    if (!ALLOWED.includes(url.pathname)) return new Response("Not found", { status: 404 });
   const SITES = [
  "https://mathmaster-tx.surge.sh",
  "https://mathmaster-tx-2.surge.sh",
  "https://mathmaster-tx-3.surge.sh",
  "https://mathmaster-tx-4.surge.sh",
  "https://mathmaster-tx-5.surge.sh",
  "https://mathmaster-tx-6.surge.sh",
  "https://mathmaster-tx-7.surge.sh",
  "https://mathmaster-tx-8.surge.sh",
  "https://mathmaster-tx-9.surge.sh",
  "https://mathmaster-tx-10.surge.sh",
  "https://sites.google.com/mathmaster-tx-2",
  // add every domain your site runs on
];

const origin = req.headers.get("origin") || "";
if (!SITES.includes(origin)) return new Response("Forbidden", { status: 403 });
    const headers = new Headers(req.headers);
    headers.delete("host");
    headers.set("skip_zrok_interstitial", "true"); // harmless if the tunnel isn't zrok
    const upstream = await fetch(env.TARGET + url.pathname + url.search, {
      method: req.method, headers, body: req.body,
    });
    return cors(new Response(upstream.body, upstream));
  },
};

function cors(res) {
  const r = new Response(res.body, res);
  r.headers.set("access-control-allow-origin", "origin");
  r.headers.set("access-control-allow-headers", "*");
  r.headers.set("access-control-expose-headers", "content-range, content-length, accept-ranges");
  return r;
}