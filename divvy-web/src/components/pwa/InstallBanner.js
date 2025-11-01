// src/components/pwa/InstallBanner.js
"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const SHOW_DELAY_MS = 300;

/** Strict phone detection (exclude desktop & most tablets, include big phones/foldables) */
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
  const phoneSized = maxSide > 0 && maxSide <= 768; // <=768px → include large phones/foldables

  return (uaDataMobile || isPhoneUA) && (coarse || phoneSized) && !isIPadLike;
}

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState("android"); // 'android' | 'ios'
  const [isPhone, setIsPhone] = useState(false);
  const [androidReady, setAndroidReady] = useState(false);
  const delayedShowTimer = useRef(null);

  // minimal global (SW + event wiring is in app/layout.js)
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__pwa = window.__pwa || {
      canInstall: false,
      deferredPrompt: null,
      installed: false, // ignored by this component (we always show)
      isIOS: /iphone|ipod/i.test(navigator.userAgent || ""),
    };
  }, []);

  const closeBanner = useCallback(() => setVisible(false), []);

  const onAndroidInstall = useCallback(async () => {
    if (!window?.__pwa?.deferredPrompt) return;
    const dp = window.__pwa.deferredPrompt;
    dp.prompt();
    try {
      await dp.userChoice;
    } catch {
      // ignore
    } finally {
      window.__pwa.deferredPrompt = null;
      setAndroidReady(false);
      setVisible(false);
    }
  }, []);

  // Cleanup pending timers
  useEffect(
    () => () => {
      if (delayedShowTimer.current) clearTimeout(delayedShowTimer.current);
    },
    []
  );

  // Visibility logic: ALWAYS show on phones (no installed/suppress checks)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const phone = isPhoneDevice();
    setIsPhone(phone);
    if (!phone) return;

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
      const ready = !!(
        window.__pwa?.canInstall && window.__pwa?.deferredPrompt
      );
      setAndroidReady(ready);
      // We still show even if not ready yet (button will be disabled until ready)
      showWithDelay(
        ready ? "android" : window.__pwa?.isIOS ? "ios" : "android"
      );
    };

    const onCanInstall = () => {
      setAndroidReady(true);
      showWithDelay("android");
    };
    const onInstalled = () => setVisible(false);
    const onIOSTip = () => showWithDelay("ios");

    // Allow manual open from anywhere
    const onOpenBanner = () => {
      const preferAndroid = !!(
        window.__pwa?.canInstall && window.__pwa?.deferredPrompt
      );
      setAndroidReady(preferAndroid);
      showWithDelay(preferAndroid ? "android" : "ios");
    };

    window.addEventListener("pwa:can-install", onCanInstall);
    window.addEventListener("pwa:installed", onInstalled);
    window.addEventListener("pwa:ios-tip", onIOSTip);
    window.addEventListener("pwa:open-banner", onOpenBanner);

    // Always show something on phones after mount
    maybeShowAndroid();

    return () => {
      window.removeEventListener("pwa:can-install", onCanInstall);
      window.removeEventListener("pwa:installed", onInstalled);
      window.removeEventListener("pwa:ios-tip", onIOSTip);
      window.removeEventListener("pwa:open-banner", onOpenBanner);
    };
  }, []);

  // 🚫 Never render on desktop/tablets
  if (!isPhone || !visible) return null;

  const isAndroid = mode === "android";

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
              alt="Divsez"
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
            />
          </div>

          <div className="min-w-0 flex-1">
            {isAndroid ? (
              <>
                <p className="text-sm font-semibold text-slate-900">
                  Install Divsez
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Tap below to add Divsez to your home screen.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-900">
                  Add Divsez to Home Screen
                </p>
                <div className="mt-1 text-xs text-slate-700">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>
                      Tap the <b>Share</b> icon in your browser.
                    </li>
                    <li>
                      Choose <b>Add to Home Screen</b>.
                    </li>
                    <li>
                      Confirm to add <b>Divsez</b>.
                    </li>
                  </ol>
                  <p className="mt-2 text-[11px] text-slate-500">
                    If the icon doesn’t appear, iOS may place it in the{" "}
                    <b>App Library</b>.
                  </p>
                </div>
              </>
            )}
          </div>

          <button
            onClick={closeBanner}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            aria-label="Close install banner"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={closeBanner}
            className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            {isAndroid ? "Later" : "Got it"}
          </button>

          {isAndroid && (
            <button
              onClick={onAndroidInstall}
              disabled={!androidReady}
              className={[
                "rounded-lg px-3 py-2 text-xs font-semibold text-white hover:brightness-95",
                androidReady
                  ? "bg-[#84CC16]"
                  : "bg-slate-300 cursor-not-allowed",
              ].join(" ")}
              title={androidReady ? "Install app" : "Preparing install…"}
            >
              {androidReady ? "Install app" : "Preparing…"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
