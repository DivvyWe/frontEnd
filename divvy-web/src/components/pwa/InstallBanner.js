// src/components/pwa/InstallBanner.js
"use client";

import { useEffect, useState, useCallback } from "react";

const DISMISS_KEY = "pwa-dismiss-until";
const IOS_SUPPRESS_KEY = "pwa-ios-suppress-until";
const DAY = 24 * 60 * 60 * 1000;

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState("android"); // 'android' | 'ios'

  const hideFor = useCallback(
    (ms) => {
      try {
        const until = Date.now() + ms;
        localStorage.setItem(
          mode === "ios" ? IOS_SUPPRESS_KEY : DISMISS_KEY,
          String(until)
        );
      } catch {}
      setVisible(false);
    },
    [mode]
  );

  const onInstallClick = useCallback(async () => {
    // Android/Chrome path via beforeinstallprompt
    if (
      mode === "android" &&
      typeof window !== "undefined" &&
      window.__pwa?.deferredPrompt
    ) {
      const dp = window.__pwa.deferredPrompt;
      dp.prompt();
      try {
        const choice = await dp.userChoice;
        // accepted or dismissed
        if (choice && choice.outcome === "accepted") {
          setVisible(false);
        } else {
          // user dismissed -> cool down 7 days
          hideFor(7 * DAY);
        }
      } catch {
        hideFor(3 * DAY);
      } finally {
        window.__pwa.deferredPrompt = null; // can't reuse
      }
      return;
    }
    // iOS has no native prompt — just show tips
    setVisible(false);
  }, [mode, hideFor]);

  const onClose = useCallback(() => {
    // quick close -> short cool down
    hideFor(1 * DAY);
  }, [hideFor]);

  const onDontShow = useCallback(() => {
    // user opted out longer
    hideFor(30 * DAY);
  }, [hideFor]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // never show if already installed/standalone
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone || window.__pwa?.installed) return;

    const now = Date.now();
    let dismissedUntil = 0;
    let iosSuppressedUntil = 0;
    try {
      dismissedUntil = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10);
      iosSuppressedUntil = parseInt(
        localStorage.getItem(IOS_SUPPRESS_KEY) || "0",
        10
      );
    } catch {}

    const maybeShowAndroid = () => {
      // if event already captured before this component mounted
      if (
        window.__pwa?.canInstall &&
        window.__pwa?.deferredPrompt &&
        now > dismissedUntil
      ) {
        setMode("android");
        setVisible(true);
      }
    };

    const onCanInstall = () => {
      if (Date.now() > dismissedUntil) {
        setMode("android");
        setVisible(true);
      }
    };

    const onInstalled = () => setVisible(false);

    const onIOSTip = () => {
      if (Date.now() > iosSuppressedUntil) {
        setMode("ios");
        setVisible(true);
      }
    };

    window.addEventListener("pwa:can-install", onCanInstall);
    window.addEventListener("pwa:installed", onInstalled);
    window.addEventListener("pwa:ios-tip", onIOSTip);

    // check initial state
    maybeShowAndroid();

    return () => {
      window.removeEventListener("pwa:can-install", onCanInstall);
      window.removeEventListener("pwa:installed", onInstalled);
      window.removeEventListener("pwa:ios-tip", onIOSTip);
    };
  }, []);

  if (!visible) return null;

  // simple bottom sheet banner (Tailwind classes)
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60]">
      <div className="mx-auto mb-4 w-[min(720px,92%)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-black/5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-100">
            <img
              src="/icons/icon-192.png"
              alt="Divsez"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">
              {mode === "android"
                ? "Install Divsez?"
                : "Add Divsez to your Home Screen"}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {mode === "android"
                ? "Get a faster, full-screen experience. Works offline."
                : "Tap the Share button ➊, then “Add to Home Screen” ➋ to install."}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={onDontShow}
            className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"
          >
            Don’t show again
          </button>
          <button
            onClick={onInstallClick}
            className="rounded-lg bg-[#84CC16] px-3 py-2 text-xs font-semibold text-white hover:brightness-95"
          >
            {mode === "android" ? "Install app" : "Got it"}
          </button>
        </div>

        {mode === "ios" && (
          <div className="mt-3 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
            On iPhone/iPad: open in Safari, tap{" "}
            <span className="font-semibold">Share</span> , then{" "}
            <span className="font-semibold">Add to Home Screen</span>.
          </div>
        )}
      </div>
    </div>
  );
}
