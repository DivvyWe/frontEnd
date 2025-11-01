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

/** iOS + browser helpers */
function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}
function isSafariOnIOS() {
  if (!isIOS()) return false;
  const ua = navigator.userAgent || "";
  // Safari on iOS has "Safari" but not the other branded tokens
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return isSafari;
}
function isIOSInAppBrowser() {
  if (!isIOS()) return false;
  const ua = navigator.userAgent || "";
  // Common in-app browser markers or non-Safari mobile browsers
  const inApp =
    /(FBAN|FBAV|Instagram|Line|MicroMessenger|WeChat|Twitter|TikTok|Snapchat|Pinterest)/i.test(
      ua
    );
  const isNotSafari =
    !/Safari/i.test(ua) || /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua) || inApp;
  return isNotSafari;
}

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState("android"); // 'android' | 'ios'
  const [isPhone, setIsPhone] = useState(false);
  const [androidReady, setAndroidReady] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const delayedShowTimer = useRef(null);

  // minimal global (SW + event wiring is in app/layout.js)
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__pwa = window.__pwa || {
      canInstall: false,
      deferredPrompt: null,
      installed: false, // ignored by this component (we always show)
      isIOS: isIOS(),
    };
  }, []);

  const closeBanner = useCallback(() => {
    setVisible(false); // no localStorage suppression; just close for now
    setShowIOSHelp(false);
  }, []);

  const onInstallClick = useCallback(async () => {
    // iOS: open help panel instead of trying to install
    if (!/android/i.test(mode)) {
      setShowIOSHelp((v) => !v);
      return;
    }
    // Android native prompt if available
    if (mode === "android" && window?.__pwa?.deferredPrompt) {
      const dp = window.__pwa.deferredPrompt;
      dp.prompt();
      try {
        await dp.userChoice; // no persistence either way
      } catch {
        // ignore
      } finally {
        window.__pwa.deferredPrompt = null;
        setAndroidReady(false);
      }
      setVisible(false);
      return;
    }
    setVisible(false);
  }, [mode]);

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
    const onInstalled = () => {
      // We intentionally do NOT hide permanently; still just close this instance
      setVisible(false);
      setShowIOSHelp(false);
    };
    const onIOSTip = () => {
      showWithDelay("ios");
    };

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
  const iosInApp = !isAndroid && isIOSInAppBrowser();
  const iosSafari = !isAndroid && isSafariOnIOS();

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
            <p className="text-sm font-semibold text-slate-900">
              {isAndroid ? "Install the app" : "Add to Home Screen"}
            </p>

            {isAndroid ? (
              <p className="mt-0.5 text-xs text-slate-600">
                Add Divsez to your home screen.
              </p>
            ) : (
              <>
                <p className="mt-0.5 text-xs text-slate-600">
                  {iosInApp
                    ? "Open this page in Safari to install."
                    : "Open Share → Add to Home Screen to install Divsez."}
                </p>
                {!iosInApp && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Tip: In Safari, tap the <b>Share</b> icon, then choose{" "}
                    <b>Add to Home Screen</b>.
                  </p>
                )}
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

        {/* iOS helper panel */}
        {!isAndroid && showIOSHelp && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            {iosInApp ? (
              <>
                <p className="font-semibold">Open in Safari first</p>
                <ol className="mt-1 list-decimal pl-5 space-y-1">
                  <li>Tap the menu in this app’s browser.</li>
                  <li>
                    Choose <b>Open in Safari</b>.
                  </li>
                  <li>
                    In Safari: tap <b>Share</b> → <b>Add to Home Screen</b>.
                  </li>
                </ol>
              </>
            ) : (
              <>
                <p className="font-semibold">How to install on iPhone</p>
                <ol className="mt-1 list-decimal pl-5 space-y-1">
                  <li>
                    Tap the <b>Share</b> icon in Safari.
                  </li>
                  <li>
                    Select <b>Add to Home Screen</b>.
                  </li>
                  <li>
                    Confirm the name and tap <b>Add</b>.
                  </li>
                </ol>
                <p className="mt-2 text-[11px] text-slate-500">
                  Can’t see the icon? iOS may place it in <b>App Library</b>. Go
                  to Settings → Home Screen → <i>Newly Downloaded Apps</i> →
                  <b> Add to Home Screen</b>.
                </p>
              </>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-end gap-2">
          {/* Toggle help on iOS, normal close on Android */}
          <button
            onClick={() => {
              if (isAndroid) {
                closeBanner();
              } else {
                setShowIOSHelp((v) => !v);
              }
            }}
            className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100"
          >
            {isAndroid
              ? "Don’t show again"
              : showIOSHelp
              ? "Hide steps"
              : "How to install"}
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
                : iosInApp
                ? "Open in Safari to install"
                : "Add to Home Screen steps"
            }
          >
            {isAndroid
              ? isAndroid && !androidReady
                ? "Preparing…"
                : "Install app"
              : iosInApp
              ? "Open in Safari"
              : showIOSHelp
              ? "Close help"
              : "How to install"}
          </button>
        </div>

        {/* Optional micro-nudge if in-app browser */}
        {!isAndroid && iosInApp && !showIOSHelp && (
          <div className="mt-2 text-[11px] text-slate-500">
            You’re in an in-app browser. Tap the menu and choose{" "}
            <b>Open in Safari</b> to install.
          </div>
        )}

        {/* Optional micro-nudge if Safari but not showing steps yet */}
        {!isAndroid && iosSafari && !showIOSHelp && (
          <div className="mt-2 text-[11px] text-slate-500">
            In Safari: <b>Share</b> → <b>Add to Home Screen</b>.
          </div>
        )}
      </div>
    </div>
  );
}
