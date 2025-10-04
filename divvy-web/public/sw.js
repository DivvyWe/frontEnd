/* global self, clients */

/**
 * Divsez Service Worker
 * - Push notifications (keeps your existing behavior)
 * - Offline support (navigations + static assets)
 * - Update flow (skipWaiting/clients.claim + message bridge)
 */

const APP_NAME = "Divsez";
const SW_VERSION = "v6";
const CACHE_NAME = `divsez-cache-${SW_VERSION}`;

// Precache these (adjust if needed)
const PRECACHE_URLS = [
  "/", // app shell
  "/offline", // fallback page (optional, but recommended)
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-192-maskable.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  // notification/badge assets you already use:
  "/icons/notification-192.png",
  "/icons/badge-72.png",
];

// ---------- Helpers ----------
const isHTMLRequest = (req) =>
  req.mode === "navigate" ||
  (req.headers.get("accept") || "").includes("text/html");

const sameOrigin = (url) => url.origin === self.location.origin;

async function safePrecache(urls) {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res && res.ok) await cache.put(url, res.clone());
      } catch (_) {
        // ignore missing assets (e.g., offline page not present)
      }
    })
  );
}

// ---------- Install / Activate / Messages ----------
self.addEventListener("install", (event) => {
  event.waitUntil(safePrecache(PRECACHE_URLS));
  self.skipWaiting(); // activate immediately
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null))
      );
      await self.clients.claim();
    })()
  );
});

// Allow page to trigger skipWaiting (for in-app "Update available" toaster)
self.addEventListener("message", (event) => {
  const data = event?.data;
  if (data && data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  // (reserved for future)
});

// ---------- Fetch (offline strategies) ----------
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Avoid caching cross-origin or API calls by default
  if (!sameOrigin(url) || url.pathname.startsWith("/api/")) {
    return; // let the network handle it
  }

  // 1) HTML navigations → Network-first, fallback to cache, then /offline
  if (isHTMLRequest(req)) {
    event.respondWith(
      (async () => {
        try {
          const network = await fetch(req, { cache: "no-store" });
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, network.clone()).catch(() => {});
          return network;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(req);
          if (cached) return cached;
          const offline = await cache.match("/offline");
          return (
            offline ||
            new Response("You are offline.", {
              status: 200,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })()
    );
    return;
  }

  // 2) Next.js static chunks & images → Cache-first
  if (
    /^\/_next\/static\//.test(url.pathname) ||
    /^\/_next\/image/.test(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        if (cached) return cached;
        const network = await fetch(req);
        if (network && network.ok)
          cache.put(req, network.clone()).catch(() => {});
        return network;
      })()
    );
    return;
  }

  // 3) Fonts → Cache-first (usually very stable)
  if (/\.(woff2?|ttf|otf)$/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        if (cached) return cached;
        const network = await fetch(req);
        if (network && network.ok)
          cache.put(req, network.clone()).catch(() => {});
        return network;
      })()
    );
    return;
  }

  // 4) Images/icons → Stale-while-revalidate
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        const networkPromise = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => null);
        return (
          cached ||
          (await networkPromise) ||
          new Response(null, { status: 504 })
        );
      })()
    );
    return;
  }

  // 5) Other same-origin GET → Stale-while-revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const networkPromise = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
          return res;
        })
        .catch(() => null);
      return (
        cached || (await networkPromise) || new Response(null, { status: 504 })
      );
    })()
  );
});

// ---------- Push Notifications (your existing logic, preserved) ----------

// Handle incoming pushes
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event?.data ? event.data.json() : {};
  } catch (_e) {
    payload = {
      title: APP_NAME,
      body: event.data && event.data.text ? event.data.text() : "",
    };
  }

  const {
    title = APP_NAME,
    body = "",
    icon = "/icons/notification-192.png",
    badge = "/icons/badge-72.png",
    tag, // replace/update prior notification
    url = "/", // navigation target on click
    actions = [], // e.g. [{action:'open', title:'Open'}]
    requireInteraction = false,
  } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      data: { url },
      actions,
      requireInteraction,
    })
  );
});

// Handle clicks on the notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        try {
          const sameOriginClient =
            client.url && client.url.startsWith(self.location.origin);
          if (sameOriginClient && "focus" in client) {
            await client.focus();
            // Let the SPA router handle navigation
            client.postMessage({ type: "push_click", url });
            return;
          }
        } catch (_e) {}
      }

      // No matching tab: open new
      if (clients.openWindow) {
        await clients.openWindow(url);
      }
    })()
  );
});
