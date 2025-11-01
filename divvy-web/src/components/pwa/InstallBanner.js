// src/components/pwa/InstallBanner.js
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Behavior:
 * - "Close" → hides only for this session (no persistence). After refresh, it can show again.
 * - "Don't show again" → persists a "never show" flag in localStorage; banner will never show again.
 * - Android: uses beforeinstallprompt via window.__pwa.deferredPrompt (set by layout.js).
 * - iOS: shows a help tip with instructions: Share → Add to Home Screen.
 * - Adds an iOS fallback: if events are missed, auto-open after a short delay.
 */

const NEVER_SHOW_KEY = "pwa-never-show"; // "1" means never show again (persisted)
const SHOW_DELAY_MS = 250;
const IOS_FALLBACK_DELAY_MS = 700; // try after React mounts even if events raced

function isInStandalone() {
  try {
    return (
      (window.matchMedia &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true
    );
  } catch {
    return false;
  }
}

// iOS device detection (covers Safari/Chrome/Edge/Firefox on iOS; iPadOS "Macintosh" UA with touch)
function isIOSDevice() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iPhoneOrPod = /iPhone|iPod/i.test(ua);
  const iPadLike = /iPad|Macintosh/i.test(ua) && "ontouchend" in window;
  return iPhoneOrPod || iPadLike;
}

// True Safari (has install path). Other iOS browsers usually can't install.
function isTrueSafari() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua);
}

// Phone-ish device filter (keeps your size/pointer heuristics)
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
  const [ios, setIOS] = useState(false);
  const [trueSafari, setTrueSafari] = useState(false);

  const delayTimer = useRef(null);
  const iosFallbackTimer = useRef(null);
  const sessionClosedRef = useRef(false); // prevent re-open loops in this session

  const neverShow = () => {
    try {
      localStorage.setItem(NEVER_SHOW_KEY, "1");
    } catch {}
    setVisible(false);
    sessionClosedRef.current = true;
  };

  const onClose = () => {
    setVisible(false);
    sessionClosedRef.current = true; // don't reshow automatically this session
  };

  const onInstallClick = useCallback(async () => {
    if (isAndroid && window?.__pwa?.deferredPrompt) {
      // Android native prompt
      const dp = window.__pwa.deferredPrompt;
      dp.prompt();
      try {
        await dp.userChoice; // { outcome, platform }
      } catch {}
      // Either way, hide for now (no persistence)
      setVisible(false);
      sessionClosedRef.current = true;
      // Clear prompt so it doesn't re-trigger without a page lifecycle
      window.__pwa.deferredPrompt = null;
      setAndroidReady(false);
      return;
    }
    // iOS: just acknowledge the tip
    setVisible(false);
    sessionClosedRef.current = true;
  }, [isAndroid]);

  // Helper to open with small delay (for smoothness)
  const showWithDelay = useCallback((android) => {
    if (delayTimer.current) clearTimeout(delayTimer.current);
    setIsAndroid(!!android);
    delayTimer.current = setTimeout(() => {
      if (!sessionClosedRef.current) setVisible(true);
    }, SHOW_DELAY_MS);
  }, []);

  // Main effects
  useEffect(() => {
    if (typeof window === "undefined") return;

    const phone = isPhoneDevice();
    const onIOS = isIOSDevice();

    setIsPhone(phone);
    setIOS(onIOS);
    setTrueSafari(isTrueSafari());

    // If user chose "never show", bail out forever
    try {
      if (localStorage.getItem(NEVER_SHOW_KEY) === "1") return;
    } catch {}

    if (!phone) return;
    if (isInStandalone()) return; // already installed → do not show

    // Detect Android vs iOS (for button text & flow)
    setIsAndroid(/android/i.test(navigator.userAgent));

    // Listen to events fired by layout.js
    const onCanInstall = () => {
      setAndroidReady(true);
      showWithDelay(true); // Android path: beforeinstallprompt ready
    };

    const onIOSTip = () => {
      // Respect "never-show" but not session close
      try {
        if (localStorage.getItem(NEVER_SHOW_KEY) === "1") return;
      } catch {}
      if (sessionClosedRef.current) return;
      showWithDelay(false); // iOS path: manual instructions
    };

    const onInstalled = () => setVisible(false);

    const onOpenBanner = () => {
      try {
        if (localStorage.getItem(NEVER_SHOW_KEY) === "1") return;
      } catch {}
      if (sessionClosedRef.current) return;
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

    // --- iOS fallback ---
    // Some iOS contexts/in-app browsers may suppress or delay our custom event.
    // As a safety net, if we’re on iOS and not installed, auto-open once.
    if (onIOS && !isInStandalone()) {
      if (iosFallbackTimer.current) clearTimeout(iosFallbackTimer.current);
      iosFallbackTimer.current = setTimeout(() => {
        try {
          if (localStorage.getItem(NEVER_SHOW_KEY) === "1") return;
        } catch {}
        if (sessionClosedRef.current) return;
        // If no Android prompt and we haven't become visible yet, open the iOS tip
        if (!window.__pwa?.deferredPrompt && !visible) {
          setIsAndroid(false);
          setVisible(true);
        }
      }, IOS_FALLBACK_DELAY_MS);
    }

    // Re-check when tab becomes visible (helps after back/forward)
    const onVis = () => {
      if (document.hidden) return;
      if (sessionClosedRef.current) return;
      if (onIOS && !isInStandalone()) {
        try {
          if (localStorage.getItem(NEVER_SHOW_KEY) === "1") return;
        } catch {}
        // Open the tip if we’re still not visible
        if (!visible) {
          setIsAndroid(false);
          setVisible(true);
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("pwa:can-install", onCanInstall);
      window.removeEventListener("pwa:ios-tip", onIOSTip);
      window.removeEventListener("pwa:installed", onInstalled);
      window.removeEventListener("pwa:open-banner", onOpenBanner);
      mq?.removeEventListener?.("change", onDisplayModeChange);
      document.removeEventListener("visibilitychange", onVis);
      if (delayTimer.current) clearTimeout(delayTimer.current);
      if (iosFallbackTimer.current) clearTimeout(iosFallbackTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWithDelay, visible]);

  if (!isPhone || !visible) return null;

  const showSafariHint = ios && !trueSafari; // iOS but not true Safari → in-app/alt browser

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
            {/* Use <img> for widest browser support */}
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
                    Tap <b>Add</b>, a Divsez icon will appear on your Home
                    Screen.
                  </li>
                </ol>
                {/* {showSafariHint && (
                  <p className="mt-1 text-[11px] text-amber-700">
                    Tip: Open this page in <b>Safari</b> to install.
                  </p>
                )} */}
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
