"use client";

import { useEffect } from "react";

export default function PushBootstrap() {
  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator)) return;
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        await navigator.serviceWorker.ready; // active and ready
        window.__swReg = reg;
        console.info("[push] SW registered");
      } catch (e) {
        console.error("[push] SW register failed", e);
      }
    })();
  }, []);

  return null;
}
