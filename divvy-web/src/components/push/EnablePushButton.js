"use client";
import { subscribePush } from "@/lib/push";

export default function EnablePushButton({ className = "" }) {
  const onClick = async () => {
    try {
      // 1) Ask + subscribe in the browser (returns PushSubscription)
      const sub = await subscribePush();

      // 2) Save via proxy so Authorization is auto-attached from cookies
      const res = await fetch("/api/proxy/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          // ensure plain object, not complex subscription
          keys: sub.toJSON?.().keys || sub.keys,
          ua: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`Save failed: ${res.status} ${msg?.slice(0, 120)}`);
      }

      alert("Notifications enabled ✅");
    } catch (err) {
      console.error("❌ Push enable error:", err);
      alert(err?.message || "Failed to enable notifications");
    }
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 bg-[#84CC16] text-white hover:opacity-95 ${className}`}
    >
      Enable notifications
    </button>
  );
}
