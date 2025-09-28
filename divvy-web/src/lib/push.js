// /src/lib/push.js

// Register the service worker (must be called from the browser)
export async function ensureServiceWorker() {
  if (typeof window === "undefined") throw new Error("Not in a browser");
  if (!("serviceWorker" in navigator))
    throw new Error("Service workers not supported");
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  return reg;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

// Ask for permission + create a PushSubscription with your VAPID public key
export async function subscribePush() {
  // 1) ensure SW
  const reg = await ensureServiceWorker();

  // 2) ask permission (ideally you show your own soft prompt first)
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw new Error("Notification permission denied");

  // 3) get public key from env (exposed with NEXT_PUBLIC_)
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");

  // 4) subscribe
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  // this object (endpoint + keys) is what you POST to your backend
  return sub.toJSON(); // { endpoint, keys: { p256dh, auth } }
}

// utility to unregister (optional)
export async function unsubscribePush() {
  const reg = await ensureServiceWorker();
  const sub = await reg.pushManager.getSubscription();
  if (sub) await sub.unsubscribe();
  return true;
}
