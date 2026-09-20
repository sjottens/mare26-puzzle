/* maré26 service worker — generated into out/sw.js by scripts/build-sw.mjs.
 * Precaches the whole static export so the game works fully offline.
 * The version string and precache list below are injected at build time. */
const VERSION = "__VERSION__";
const CACHE = "mare26-" + VERSION;
const PRECACHE = __PRECACHE__;

self.addEventListener("install", (event) => {
  // No skipWaiting: a new version activates on the next launch, so an open
  // session never mixes old HTML with new hashed chunks.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("mare26-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === "navigate") {
        const shell = await cache.match("/");
        if (shell) return shell;
      }
      try {
        return await fetch(req);
      } catch (err) {
        if (req.mode === "navigate") {
          const shell = await cache.match("/");
          if (shell) return shell;
        }
        throw err;
      }
    }),
  );
});
