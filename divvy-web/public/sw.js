// public/sw.js
/* global self, clients */

// --- ESM marker (lets you register with { type: 'module' }) ---
export {};

/**
 * Divsez Service Worker
 * - Push notifications
 * - Offline support (navigations + static assets)
 * - Update flow (skipWaiting/clients.claim + message bridge)
 *
 * NOTE: We intentionally DO NOT cache /_next/** to avoid stale-bundle issues.
 */

const APP_NAME = "Divsez";
const SW_VERSION = "v8";
const CACHE_NAME = `Divsez-cache-${SW_VERSION}`;

// Precache these (adjust if needed)
const PRECACHE_URLS = [
  "/", // app shell
  "/offline", // optional fallback page
  "/manifest.webmanifest",
  "/favicon.ico", // keep if you have it
  "/icons/favicon-16.png", // referenced in layout.js
  "/icons/apple-touch-icon.png", // referenced in layout.js
  "/icons/icon-192.png",
  "/icons/icon-192-maskable.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/icons/notification-192.png",
  "/icons/badge-72.png",
];

/* ------------------------------ Helpers ------------------------------ */
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
      } catch {
        // ignore (e.g., /offline might not exist)
      }
    })
  );
}

/* --------------------- Install / Activate / Messages --------------------- */
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
      // 🔧 Enable navigation preload
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {}
      }
      await self.clients.claim();
    })()
  );
});

// Allow page to trigger skipWaiting or clean caches
self.addEventListener("message", (event) => {
  const data = event?.data;
  if (!data) return;

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (data.type === "CLEAN_CACHES") {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      })()
    );
  }
});

/* -------------------------- Fetch (strategies) -------------------------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 0) Never touch Next.js bundles/HMR or dev internals
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/__next")
  ) {
    return; // always let the network/browser handle it
  }

  // 1) Skip cross-origin and API calls
  if (!sameOrigin(url) || url.pathname.startsWith("/api/")) {
    return; // network only
  }

  // 2) HTML navigations → Network-first (with preload), then cache, then /offline
  if (isHTMLRequest(req)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        try {
          // Use preloaded response if available (very fast path)
          const preload = await event.preloadResponse;
          if (preload) {
            cache.put(req, preload.clone()).catch(() => {});
            return preload;
          }

          // Normal network
          const network = await fetch(req, { cache: "no-store" });
          cache.put(req, network.clone()).catch(() => {});
          return network;
        } catch {
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

  // 3) Fonts → Cache-first (usually stable)
  if (/\.(woff2?|ttf|otf)$/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        if (cached) return cached;
        const network = await fetch(req).catch(() => null);
        if (network && network.ok)
          cache.put(req, network.clone()).catch(() => {});
        return network || new Response(null, { status: 504 });
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

/* ---------------- Push Notifications (preserved behavior) ---------------- */

// Handle incoming pushes
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event?.data ? event.data.json() : {};
  } catch {
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

// Handle clicks on the notification (SPA handoff + hard navigate fallback)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";

  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of all) {
        try {
          const sameOrigin =
            client.url && client.url.startsWith(self.location.origin);
          if (!sameOrigin) continue;

          // Focus existing window if possible
          if ("focus" in client) await client.focus();

          // Try SPA handoff first
          try {
            client.postMessage({ type: "push_click", url });
          } catch {}

          // If page can't handle it, hard navigate
          if ("navigate" in client) return client.navigate(url);
          return;
        } catch {}
      }

      // No existing window — open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })()
  );
});
