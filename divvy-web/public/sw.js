/* global self, clients */

// Default app name (env won’t be injected in SW at runtime unless you replace at build)
const appName = "Divsez";

// Handle incoming pushes
self.addEventListener("push", (event) => {
  console.log("[SW] Push event received:", event.data?.text());
  let payload = {};
  try {
    payload = event?.data ? event.data.json() : {};
  } catch (_e) {
    // fallback to text if not JSON
    payload = {
      title: appName,
      body: event.data && event.data.text ? event.data.text() : "",
    };
  }

  const {
    title = appName,
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
  console.log("[SW] Notification clicked:", event.notification);
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        try {
          const sameOrigin =
            client.url && client.url.startsWith(self.location.origin);
          if (sameOrigin && "focus" in client) {
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

// Optional: listen for messages from the page
self.addEventListener("message", (_event) => {
  // no-op (reserved for future use)
});
