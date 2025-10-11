// src/components/pwa/InstallBanner.js
"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const DISMISS_KEY = "pwa-dismiss-until";
const IOS_SUPPRESS_KEY = "pwa-ios-suppress-until";
const DAY = 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 300;

/** Strict phone detection (exclude desktop & most tablets) */
function isPhoneDevice() {
  if (typeof window === "undefined") return false;

  const ua = (navigator.userAgent || "").toLowerCase();
  const uaDataMobile = navigator.userAgentData?.mobile === true;

  // Phone UAs (exclude iPad)
  const isPhoneUA =
    /(android.*mobile|iphone|ipod|windows phone|blackberry|iemobile)/i.test(ua);

  // iPadOS can report "Macintosh" + touch; treat as tablet (not phone)
  const isIPadLike =
    /ipad|macintosh/i.test(navigator.userAgent) && "ontouchend" in window;

  // Pointer/screen hints
  const coarse = matchMedia?.("(pointer: coarse)")?.matches;
  const maxSide = Math.min(screen?.width || 0, screen?.height || 0);
  const phoneSized = maxSide > 0 && maxSide <= 600; // <=600px → phone-ish

  return (uaDataMobile || isPhoneUA) && (coarse || phoneSized) && !isIPadLike;
}

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState("android"); // 'android' | 'ios'
  const [isPhone, setIsPhone] = useState(false);
  const delayedShowTimer = useRef(null);

  const isStandaloneNow = () =>
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true);

  // Ensure a minimal global exists (the event wiring + SW register
  // now lives in app/layout.js to avoid duplication)
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__pwa = window.__pwa || {
      canInstall: false,
      deferredPrompt: null,
      installed: isStandaloneNow(),
    };
  }, []);

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
    // Android native prompt if available
    if (mode === "android" && window?.__pwa?.deferredPrompt) {
      const dp = window.__pwa.deferredPrompt;
      dp.prompt();
      try {
        const choice = await dp.userChoice;
        if (choice?.outcome === "accepted") setVisible(false);
        else hideFor(7 * DAY);
      } catch {
        hideFor(3 * DAY);
      } finally {
        window.__pwa.deferredPrompt = null;
      }
      return;
    }
    // iOS: no native prompt — just close after showing the hint
    setVisible(false);
  }, [mode, hideFor]);

  const onClose = useCallback(() => hideFor(1 * DAY), [hideFor]);
  const onDontShow = useCallback(() => hideFor(30 * DAY), [hideFor]);

  // Cleanup pending timers
  useEffect(
    () => () =>
      delayedShowTimer.current && clearTimeout(delayedShowTimer.current),
    []
  );

  // Visibility logic driven by events that layout.js dispatches:
  //  - pwa:can-install (Android/Chromium beforeinstallprompt bridge)
  //  - pwa:installed
  //  - pwa:ios-tip (layout fires this for iOS Safari)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1) Detect phone once ⟶ bail early on desktop/tablets
    const phone = isPhoneDevice();
    setIsPhone(phone);
    if (!phone) return;

    // 2) Don’t show if already installed / standalone
    if (isStandaloneNow() || window.__pwa?.installed) return;

    // 3) Respect cool-downs
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

    const showWithDelay = (detectedMode) => {
      if (delayedShowTimer.current) clearTimeout(delayedShowTimer.current);
      setMode(detectedMode);
      delayedShowTimer.current = setTimeout(
        () => setVisible(true),
        SHOW_DELAY_MS
      );
    };

    // If captured before mount (layout may have already set these)
    const maybeShowAndroid = () => {
      if (
        window.__pwa?.canInstall &&
        window.__pwa?.deferredPrompt &&
        now > dismissedUntil
      ) {
        showWithDelay("android");
      }
    };

    const onCanInstall = () => {
      if (Date.now() > dismissedUntil) showWithDelay("android");
    };
    const onInstalled = () => setVisible(false);
    const onIOSTip = () => {
      if (Date.now() > iosSuppressedUntil) showWithDelay("ios");
    };

    // Hide if display-mode flips to standalone while open
    const mq = window.matchMedia?.("(display-mode: standalone)");
    const onDisplayModeChange = (e) => e.matches && setVisible(false);
    mq?.addEventListener?.("change", onDisplayModeChange);

    window.addEventListener("pwa:can-install", onCanInstall);
    window.addEventListener("pwa:installed", onInstalled);
    window.addEventListener("pwa:ios-tip", onIOSTip);

    maybeShowAndroid();

    return () => {
      window.removeEventListener("pwa:can-install", onCanInstall);
      window.removeEventListener("pwa:installed", onInstalled);
      window.removeEventListener("pwa:ios-tip", onIOSTip);
      mq?.removeEventListener?.("change", onDisplayModeChange);
    };
  }, []);

  // 🚫 Never render on desktop/tablets
  if (!isPhone || !visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60]">
      <div
        role="dialog"
        aria-live="polite"
        className="mx-auto mb-4 w-[min(720px,92%)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-black/5"
      >
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
              Install the app
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {mode === "android"
                ? "Add Divsez to your home screen."
                : "Add Divsez to your home screen from the Share menu."}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            aria-label="Close install banner"
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
            Install app
          </button>
        </div>
      </div>
    </div>
  );
}
