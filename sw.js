const cache_name = "cache-iyan-v1";
const file_penting = [
  "./",
  "./index.html",
  "./menu.js",
  "./script.js",
  "./theme.js",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.9/dist/css/bootstrap.min.css",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.9/dist/js/bootstrap.bundle.min.js",
];

// 1. Install & simpan file versi baru
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cache_name).then((cache) => cache.addAll(file_penting)));
  self.skipWaiting(); // Paksa SW baru langsung ambil alih tanpa nunggu lama
});

// 2. Bersihin cache versi lama biar nggak nyampah
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== cache_name) {
            return caches.delete(cache);
          }
        }),
      );
    }),
  );
});

// 3. Cegat request buat mode offline
self.addEventListener("fetch", (event) => {
  // Abaikan request selain GET (misal form POST) atau ekstensi browser
  if (event.request.method !== "GET" || !event.request.url.startsWith("http")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Kalau file/framework udah ada di cache, langsung kasih!
      if (cachedResponse) {
        return cachedResponse;
      }

      // Kalau belum ada (misal CDN Bootstrap/Font), sedot dari internet SEKALIGUS simpen ke cache
      return fetch(event.request).then((networkResponse) => {
        return caches.open(cache_name).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    }),
  );
});
