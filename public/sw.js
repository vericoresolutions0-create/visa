const CACHE_NAME = "visaclear-v3";
const urlsToCache = ["/", "/icon/icon-192.png", "/icon/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }
  if (url.pathname.startsWith("/auth")) return;

  // Only intercept same-origin requests. Cross-origin resources (Google
  // Fonts, Convex) must hit the network normally — without this check, a
  // transient failure on any cross-origin request (e.g. a font stylesheet)
  // fell through to the icon-192.png fallback below, which the browser then
  // correctly refused to apply as a stylesheet (wrong MIME type).
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    // Stale-while-revalidate for the HTML shell: return the cached version
    // immediately (near-instant on repeat visits) while fetching an update
    // in the background. The SPA always fetches live data from Convex, so
    // an HTML shell that is one deploy old is never a problem in practice.
    event.respondWith(
      caches.match("/").then((cached) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put("/", clone));
            }
            return response;
          })
          .catch(() => null);
        return cached ?? networkFetch;
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          return response;
        })
        .catch(() => new Response("", { status: 503, statusText: "Service Unavailable" }));
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const isAppInFocus = clientList.some((client) => client.focused);
      if (!isAppInFocus) {
        return self.registration.showNotification(data.title, data.options);
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
