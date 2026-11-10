/* global __SAMPLES__ */
const PREFIX = `boomstep:${self.registration.scope}:`;
const CACHE = `${PREFIX}640b59805a7e`;
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
          "./samples/CREDITS.txt",
          "./samples/drum-kick.wav", "./samples/drum-kickround.wav", "./samples/drum-kickdeep.wav", "./samples/drum-snare.wav", "./samples/drum-snaredark.wav", "./samples/drum-clap.wav", "./samples/drum-hat.wav", "./samples/drum-openhat.wav", "./samples/drum-rim.wav", "./samples/drum-tom.wav", "./samples/drum-conga.wav", "./samples/drum-clave.wav", "./samples/drum-shaker.wav", "./samples/drum-ride.wav", "./samples/sub-28.wav", "./samples/sub-32.wav", "./samples/sub-36.wav", "./samples/sub-40.wav", "./samples/finger-29.wav", "./samples/finger-32.wav", "./samples/finger-35.wav", "./samples/finger-38.wav", "./samples/fmbass-30.wav", "./samples/fmbass-36.wav", "./samples/fmbass-42.wav", "./samples/sweep-44.wav", "./samples/sweep-48.wav", "./samples/sweep-52.wav", "./samples/sweep-56.wav", "./samples/sweep-60.wav", "./samples/sweep-64.wav", "./samples/newage-44.wav", "./samples/newage-48.wav", "./samples/newage-52.wav", "./samples/newage-56.wav", "./samples/newage-60.wav", "./samples/newage-64.wav", "./samples/bowed-44.wav", "./samples/bowed-48.wav", "./samples/bowed-52.wav", "./samples/bowed-56.wav", "./samples/bowed-60.wav", "./samples/bowed-64.wav", "./samples/strings-42.wav", "./samples/strings-48.wav", "./samples/strings-54.wav", "./samples/strings-60.wav", "./samples/strings-66.wav", "./samples/choir-42.wav", "./samples/choir-48.wav", "./samples/choir-54.wav", "./samples/choir-60.wav", "./samples/choir-66.wav", "./samples/ep-42.wav", "./samples/ep-48.wav", "./samples/ep-54.wav", "./samples/ep-60.wav", "./samples/ep-66.wav", "./samples/ep-72.wav", "./samples/hang-57.wav", "./samples/hang-62.wav", "./samples/hang-65.wav", "./samples/hang-67.wav", "./samples/hang-69.wav", "./samples/hang-72.wav", "./samples/hang-74.wav", "./samples/brass-42.wav", "./samples/brass-48.wav", "./samples/brass-54.wav", "./samples/brass-60.wav", "./samples/brass-66.wav", "./samples/brass-72.wav", "./samples/fifths-40.wav", "./samples/fifths-44.wav", "./samples/fifths-48.wav", "./samples/fifths-52.wav", "./samples/fifths-56.wav", "./samples/fifths-60.wav", "./samples/fifths-64.wav", "./samples/fifths-68.wav", "./samples/fifths-72.wav",
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
