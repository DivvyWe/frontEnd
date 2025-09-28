// src/components/PushClickHandler.js
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PushClickHandler() {
  const router = useRouter();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "push_click" && event.data.url) {
          router.push(event.data.url); // navigate SPA-style
        }
      });
    }
  }, [router]);

  return null; // invisible component
}
