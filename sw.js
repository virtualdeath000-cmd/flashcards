// Flashcards service worker — bulletproof offline caching.
// Bump CACHE_VERSION whenever you change index.html so users get the update.
const CACHE_VERSION = "v32";
const CACHE_NAME = "flashcards-" + CACHE_VERSION;
const ASSETS = ["./", "./index.html", "./Hive_Cards2.png",
  "./Hivecard_fonts/Turret_Road/TurretRoad-Regular.ttf",
  "./Hivecard_fonts/Turret_Road/TurretRoad-Medium.ttf",
  "./Hivecard_fonts/Turret_Road/TurretRoad-Bold.ttf",
  "./Hivecard_fonts/Blinker/Blinker-Regular.ttf",
  "./Hivecard_fonts/Blinker/Blinker-Bold.ttf"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never intercept sync traffic — GitHub API calls must hit the network fresh.
  if (url.hostname === "api.github.com" || url.hostname.endsWith("githubusercontent.com")) {
    return;
  }

  // Same-origin: cache-first with network fallback that refreshes the cache.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const networkFetch = fetch(req).then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return res;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});
