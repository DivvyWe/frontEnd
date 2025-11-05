// app/layout.js
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import PushClickHandler from "@/components/push/PushClickHandler";
import InstallBanner from "@/components/pwa/InstallBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: { default: "Divsez", template: "%s · Divsez" },
  description: "Easily split and track group expenses with friends.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/favicon-16.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Divsez",
  },
  other: { "format-detection": "telephone=no" },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#84CC16" },
    { media: "(prefers-color-scheme: dark)", color: "#84CC16" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-background text-foreground `}
      >
        <PushClickHandler />

        {/* -------- Service Worker registration -------- */}
        <Script id="sw-register" strategy="afterInteractive">{`
          (function () {
            if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
            var isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
            var isHttps = location.protocol === 'https:';
            if (!isLocal && !isHttps) return;

            // Avoid re-registering during HMR / soft nav
            if (navigator.serviceWorker.controller && window.__swReg) return;

            navigator.serviceWorker.register('/sw.js', { type: 'module', scope: '/' })
              .then(function (reg) {
                window.__swReg = reg;

                if (reg.waiting) {
                  window.dispatchEvent(new CustomEvent('sw:update-available', { detail: { reg } }));
                }

                reg.addEventListener('updatefound', function () {
                  var sw = reg.installing;
                  if (!sw) return;
                  sw.addEventListener('statechange', function () {
                    if (sw.state === 'installed') {
                      if (navigator.serviceWorker.controller) {
                        window.dispatchEvent(new CustomEvent('sw:update-available', { detail: { reg } }));
                      } else {
                        window.dispatchEvent(new CustomEvent('sw:ready', { detail: { reg } }));
                      }
                    }
                  });
                });

                navigator.serviceWorker.addEventListener('controllerchange', function () {
                  window.dispatchEvent(new CustomEvent('sw:updated'));
                });

                window.addEventListener('sw:skip-waiting', function () {
                  if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                });
              })
              .catch(function (err) {
                console.error('SW registration failed:', err);
              });
          })();
        `}</Script>

        {/* -------- PWA install hooks (mobile only) -------- */}
        <Script id="pwa-install-hooks" strategy="afterInteractive">{`
          (function () {
            var NEVER_SHOW_KEY = 'pwa-never-show';

            function isiPhone() { return /iphone|ipod/i.test(navigator.userAgent || ''); }
            function isPhoneLike() {
              var ua = navigator.userAgent || '';
              var mobileHints = /(android|iphone|ipod|windows phone|blackberry|iemobile)/i.test(ua);
              var isIPadLike = /ipad|macintosh/i.test(ua) && 'ontouchend' in window;
              return mobileHints && !isIPadLike;
            }
            function isStandalone() {
              try {
                return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
                  || (window.navigator.standalone === true);
              } catch { return false; }
            }
            function neverShow() {
              try { return localStorage.getItem(NEVER_SHOW_KEY) === '1'; } catch { return false; }
            }

            if (!isPhoneLike()) {
              console.debug('[PWA] skip hooks: not phone-like UA');
              return;
            }

            window.__pwa = window.__pwa || {
              deferredPrompt: null,
              canInstall: false,
              installed: false,
              isIOS: isiPhone(),
            };

            // Android native flow
            window.addEventListener('beforeinstallprompt', function (e) {
              if (neverShow()) {
                console.debug('[PWA] NEVER_SHOW set — suppress Android prompt');
                return;
              }
              e.preventDefault();
              window.__pwa.deferredPrompt = e;
              window.__pwa.canInstall = true;
              console.debug('[PWA] beforeinstallprompt captured');
              window.dispatchEvent(new CustomEvent('pwa:can-install'));
            });

            window.addEventListener('appinstalled', function () {
              window.__pwa.installed = true;
              try { localStorage.setItem('pwa-installed', '1'); } catch {}
              console.debug('[PWA] appinstalled');
              window.dispatchEvent(new CustomEvent('pwa:installed'));
            });

            // iPhone manual tip (no beforeinstallprompt)
            function maybeDispatchIOSTip(reason) {
              if (!window.__pwa.isIOS) { console.debug('[PWA] not iOS, reason:', reason); return; }
              if (neverShow()) { console.debug('[PWA] NEVER_SHOW set — suppress iOS tip, reason:', reason); return; }
              if (isStandalone()) { console.debug('[PWA] already in standalone — suppress iOS tip, reason:', reason); return; }
              setTimeout(function () {
                console.debug('[PWA] dispatch pwa:ios-tip, reason:', reason);
                window.dispatchEvent(new CustomEvent('pwa:ios-tip'));
              }, 150);
            }

            // Fire once on load
            maybeDispatchIOSTip('load');
            // Re-check on visibility
            document.addEventListener('visibilitychange', function () {
              if (!document.hidden) maybeDispatchIOSTip('visibilitychange');
            });

            // Manual trigger
            window.openInstallBanner = function () {
              if (neverShow()) {
                console.debug('[PWA] manual open blocked by NEVER_SHOW');
                return;
              }
              var preferAndroid = !!(window.__pwa && window.__pwa.canInstall && window.__pwa.deferredPrompt);
              console.debug('[PWA] manual open banner; preferAndroid=', preferAndroid);
              window.dispatchEvent(new CustomEvent('pwa:open-banner', {
                detail: { preferAndroid: preferAndroid }
              }));
            };
          })();
        `}</Script>

        <InstallBanner />

        {children}
      </body>
    </html>
  );
}
