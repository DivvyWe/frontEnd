// public/sw.js
/* global self, clients */

// --- ESM marker (lets you register with { type: 'module' }) ---
export {};

/**
 * Divsez Service Worker
 * - Push notifications
 * - Offline support (static assets only)
 * - Update flow (skipWaiting/clients.claim + message bridge)
 *
 * IMPORTANT:
 * 1) We DO NOT cache HTML navigations to avoid auth redirect loops.
 * 2) We DO NOT cache /auth or any /api/* responses.
 */

const APP_NAME = "Divsez";
const SW_VERSION = "v10";
const CACHE_NAME = `Divsez-cache-${SW_VERSION}`;

// Precache these (adjust if needed)
const PRECACHE_URLS = [
  "/", // app shell (used for offline fallback only)
  "/offline", // optional fallback page
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/favicon-16.png",
  "/icons/apple-touch-icon.png",
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

const isAuthLikePath = (path) =>
  path.startsWith("/auth") || path.startsWith("/api/proxy/auth");

function responseCacheable(res) {
  if (!res || !res.ok) return false;
  const cc = res.headers.get("cache-control") || "";
  if (/no-store|no-cache|private/i.test(cc)) return false;
  if (res.headers.has("set-cookie")) return false;
  return true;
}

async function cachePutSafe(cache, req, res) {
  try {
    if (responseCacheable(res)) {
      await cache.put(req, res.clone());
    }
  } catch {
    // ignore quota / opaque errors
  }
}

async function safePrecache(urls) {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (responseCacheable(res)) await cache.put(url, res.clone());
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
  if (!data) return false;

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return false;
  }

  if (data.type === "CLEAN_CACHES") {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      })()
    );
  }

  // Explicitly return false so the browser doesn’t expect an async response
  return false;
});

/* -------------------------- Fetch (strategies) -------------------------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 0) Never touch Next internals/bundles
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/__next")
  ) {
    return; // network/browser handles it
  }

  // 1) Skip cross-origin and ALL /api/* calls
  if (!sameOrigin(url) || url.pathname.startsWith("/api/")) {
    return; // network only
  }

  // 2) Never handle auth routes (network only)
  if (isAuthLikePath(url.pathname)) {
    return;
  }

  // 3) HTML navigations → Network-first (NO CACHING), fallback to /offline
  if (isHTMLRequest(req)) {
    event.respondWith(
      (async () => {
        try {
          const preload = await event.preloadResponse;
          if (preload) return preload;
          return await fetch(req, { cache: "no-store" });
        } catch {
          const cache = await caches.open(CACHE_NAME);
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

  // 4) Fonts → Cache-first
  if (/\.(woff2?|ttf|otf)$/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        if (cached) return cached;
        const net = await fetch(req).catch(() => null);
        if (net && responseCacheable(net)) await cachePutSafe(cache, req, net);
        return net || new Response(null, { status: 504 });
      })()
    );
    return;
  }

  // 5) Images/icons → Stale-while-revalidate
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        const netPromise = fetch(req)
          .then(async (res) => {
            if (responseCacheable(res)) await cachePutSafe(cache, req, res);
            return res;
          })
          .catch(() => null);
        return (
          cached || (await netPromise) || new Response(null, { status: 504 })
        );
      })()
    );
    return;
  }

  // 6) Other same-origin GET → Stale-while-revalidate
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const netPromise = fetch(req)
        .then(async (res) => {
          if (responseCacheable(res)) await cachePutSafe(cache, req, res);
          return res;
        })
        .catch(() => null);
      return (
        cached || (await netPromise) || new Response(null, { status: 504 })
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
    tag,
    url = "/",
    actions = [],
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
      try {
        const all = await clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        for (const client of all) {
          const same =
            client.url && client.url.startsWith(self.location.origin);
          if (!same) continue;

          if ("focus" in client) await client.focus();

          // Try SPA handoff first
          try {
            client.postMessage({ type: "push_click", url });
          } catch {}

          // If page can't handle it, hard navigate
          if ("navigate" in client) return client.navigate(url);
          return;
        }

        // No existing window — open a new one
        if (clients.openWindow) return clients.openWindow(url);
      } catch (err) {
        console.warn("[SW] notificationclick error:", err);
      }
    })()
  );
});
