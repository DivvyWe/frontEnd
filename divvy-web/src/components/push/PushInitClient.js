"use client";

export default function PushInitClient() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    // fire & forget; safe if called more than once
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => console.error("SW registration failed:", err));
  }
  return null;
}
