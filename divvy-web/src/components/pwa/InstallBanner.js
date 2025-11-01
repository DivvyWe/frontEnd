// src/components/pwa/InstallBanner.js
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Behavior:
 * - "Close" → hides only for this session (no persistence). After refresh, it can show again.
 * - "Don't show again" → persists a "never show" flag in localStorage; banner will never show again.
 * - Android: uses beforeinstallprompt via window.__pwa.deferredPrompt (set by layout.js).
 * - iOS: shows a help tip with instructions: Share → Add to Home Screen.
 */

const NEVER_SHOW_KEY = "pwa-never-show"; // "1" means never show again (persisted)
const SHOW_DELAY_MS = 250;

function isPhoneDevice() {
  if (typeof window === "undefined") return false;

  const ua = (navigator.userAgent || "").toLowerCase();
  const uaDataMobile = navigator.userAgentData?.mobile === true;

  const isPhoneUA =
    /(android.*mobile|iphone|ipod|windows phone|blackberry|iemobile)/i.test(ua);

  const isIPadLike =
    /ipad|macintosh/i.test(navigator.userAgent) && "ontouchend" in window;

  const coarse = matchMedia?.("(pointer: coarse)")?.matches;
  const maxSide = Math.min(screen?.width || 0, screen?.height || 0);
  const phoneSized = maxSide > 0 && maxSide <= 768;

  return (uaDataMobile || isPhoneUA) && (coarse || phoneSized) && !isIPadLike;
}

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [androidReady, setAndroidReady] = useState(false);
  const [isPhone, setIsPhone] = useState(false);
  const delayTimer = useRef(null);

  const isStandaloneNow = () =>
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true);

  const neverShow = () => {
    try {
      localStorage.setItem(NEVER_SHOW_KEY, "1");
    } catch {}
    setVisible(false);
  };

  const onClose = () => {
    // session-only hide; do not persist
    setVisible(false);
  };

  const onInstallClick = useCallback(async () => {
    if (isAndroid && window?.__pwa?.deferredPrompt) {
      // Android native prompt
      const dp = window.__pwa.deferredPrompt;
      dp.prompt();
      try {
        await dp.userChoice; // { outcome: 'accepted' | 'dismissed', platform: ... }
      } catch {}
      // Either way, hide for now (no persistence)
      setVisible(false);
      // Clear prompt so it doesn't re-trigger without a page lifecycle
      window.__pwa.deferredPrompt = null;
      setAndroidReady(false);
      return;
    }
    // iOS: there is no programmatic install; this just acknowledges the tip
    setVisible(false);
  }, [isAndroid]);

  // Main visibility logic
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsPhone(isPhoneDevice());
    setIsAndroid(/android/i.test(navigator.userAgent));

    // If user chose "never show", bail out forever
    try {
      if (localStorage.getItem(NEVER_SHOW_KEY) === "1") return;
    } catch {}

    if (!isPhoneDevice()) return;
    if (isStandaloneNow()) return; // already installed → do not show

    // Event handlers fired by layout.js
    const showWithDelay = (android) => {
      if (delayTimer.current) clearTimeout(delayTimer.current);
      setIsAndroid(!!android);
      delayTimer.current = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    };

    const onCanInstall = () => {
      // Android path: we have a deferredPrompt ready
      setAndroidReady(true);
      showWithDelay(true);
    };

    const onIOSTip = () => {
      // iOS path: manual instructions
      // (respect never-show, but not X/close)
      try {
        if (localStorage.getItem(NEVER_SHOW_KEY) === "1") return;
      } catch {}
      showWithDelay(false);
    };

    const onInstalled = () => setVisible(false);

    // Manual trigger (e.g., window.openInstallBanner()), still respect "never show"
    const onOpenBanner = () => {
      try {
        if (localStorage.getItem(NEVER_SHOW_KEY) === "1") return;
      } catch {}
      const preferAndroid = !!(
        window.__pwa?.canInstall && window.__pwa?.deferredPrompt
      );
      setAndroidReady(preferAndroid);
      showWithDelay(preferAndroid);
    };

    // Hide if app flips to standalone while open
    const mq = window.matchMedia?.("(display-mode: standalone)");
    const onDisplayModeChange = (e) => e.matches && setVisible(false);
    mq?.addEventListener?.("change", onDisplayModeChange);

    window.addEventListener("pwa:can-install", onCanInstall);
    window.addEventListener("pwa:ios-tip", onIOSTip);
    window.addEventListener("pwa:installed", onInstalled);
    window.addEventListener("pwa:open-banner", onOpenBanner);

    // If layout captured before this mounted, reflect readiness quickly
    if (window.__pwa?.canInstall && window.__pwa?.deferredPrompt) {
      setAndroidReady(true);
      showWithDelay(true);
    }

    return () => {
      window.removeEventListener("pwa:can-install", onCanInstall);
      window.removeEventListener("pwa:ios-tip", onIOSTip);
      window.removeEventListener("pwa:installed", onInstalled);
      window.removeEventListener("pwa:open-banner", onOpenBanner);
      mq?.removeEventListener?.("change", onDisplayModeChange);
      if (delayTimer.current) clearTimeout(delayTimer.current);
    };
  }, []);

  if (!isPhone || !visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60]"
      style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
    >
      <div
        role="dialog"
        aria-live="polite"
        className="mx-auto mb-4 w-[min(720px,92%)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-black/5"
      >
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-100">
            <img
              src="/icons/icon-192.png"
              alt="App icon"
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">
              Install the app
            </p>

            {isAndroid ? (
              <p className="mt-0.5 text-xs text-slate-600">
                Add Divsez to your home screen for a faster, app-like
                experience.
              </p>
            ) : (
              <>
                <p className="mt-0.5 text-xs text-slate-600">
                  On iPhone, install by using <b>Share</b> →{" "}
                  <b>Add to Home Screen</b>.
                </p>
                <ol className="mt-1 pl-4 text-[11px] text-slate-600 list-decimal space-y-0.5">
                  <li>
                    Tap the <b>Share</b> icon (box with an up arrow).
                  </li>
                  <li>
                    Scroll if needed, then tap <b>Add to Home Screen</b>.
                  </li>
                  <li>
                    Tap <b>Add</b> — a Divsez icon will appear on your Home
                    Screen.
                  </li>
                </ol>
              </>
            )}
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
            onClick={neverShow}
            className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50"
            title="Don’t show this again"
          >
            Don’t show again
          </button>

          <button
            onClick={onInstallClick}
            disabled={isAndroid && !androidReady}
            className={[
              "rounded-lg px-3 py-2 text-xs font-semibold text-white hover:brightness-95",
              isAndroid && !androidReady
                ? "bg-slate-300 cursor-not-allowed"
                : "bg-[#84CC16]",
            ].join(" ")}
            title={
              isAndroid && !androidReady
                ? "Preparing install…"
                : isAndroid
                ? "Install app"
                : "Got it"
            }
          >
            {isAndroid
              ? androidReady
                ? "Install app"
                : "Preparing…"
              : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}
