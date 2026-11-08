const PREFIX = `boomstep:${self.registration.scope}:`;
const CACHE = `${PREFIX}1fdfef0c3023`;
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const base = new URL("./", self.location.href);
      const cache = await caches.open(CACHE);
      await cache.addAll(
        [
          "./",
          "./manifest.webmanifest",
          "./icon-192.png",
          "./icon-512.png",
          "./recorder.js",
        ].map((p) => new URL(p, base).href),
      );
      const response = await cache.match(base.href);
      const html = await response.text();
      const assets = [
        ...html.matchAll(/(?:src|href)="([^" ]+\.(?:js|css))"/g),
      ].map((m) => new URL(m[1], base).href);
      await cache.addAll(assets);
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key !== CACHE && key.startsWith(PREFIX)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      if (event.request.mode === "navigate") {
        try {
          return await fetch(event.request);
        } catch {
          return await cache.match(new URL("./", self.location.href));
        }
      }
      return (
        (await cache.match(event.request, { ignoreVary: true })) ||
        fetch(event.request)
      );
    })(),
  );
});
