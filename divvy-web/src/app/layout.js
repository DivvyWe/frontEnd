// app/layout.js
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import PushClickHandler from "@/components/push/PushClickHandler";
import InstallBanner from "@/components/pwa/InstallBanner"; // phone-only “Install app” popup

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
    icon: "/icons/favicon-16.png", // small favicon
    shortcut: "/icons/favicon-16.png", // browser shortcut
    apple: "/icons/apple-touch-icon.png", // iOS homescreen icon
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Divsez",
  },
  other: {
    "format-detection": "telephone=no",
  },
};

// Next 15 requires themeColor in viewport (or generateViewport)
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
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        <PushClickHandler />

        {/* ---------------- Service Worker (HTTPS or localhost) ---------------- */}
        <Script id="sw-register" strategy="afterInteractive">
          {`
            (function(){
              if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

              var isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
              var isHttps = location.protocol === 'https:';
              if (!isLocal && !isHttps) return; // require HTTPS unless localhost

              navigator.serviceWorker.register('/sw.js', { type: 'module', scope: '/' })
                .then(function(reg){
                  window.__swReg = reg;

                  // If a new SW is waiting immediately (e.g., after reload)
                  if (reg.waiting) {
                    window.dispatchEvent(new CustomEvent('sw:update-available', { detail: { reg } }));
                  }

                  // Track install lifecycle
                  reg.addEventListener('updatefound', function () {
                    var sw = reg.installing;
                    if (!sw) return;
                    sw.addEventListener('statechange', function () {
                      if (sw.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                          // Updated SW installed, waiting to activate
                          window.dispatchEvent(new CustomEvent('sw:update-available', { detail: { reg } }));
                        } else {
                          // First install
                          window.dispatchEvent(new CustomEvent('sw:ready', { detail: { reg } }));
                        }
                      }
                    });
                  });

                  // When the controller changes (page now controlled by the new SW)
                  navigator.serviceWorker.addEventListener('controllerchange', function(){
                    window.dispatchEvent(new CustomEvent('sw:updated'));
                  });

                  // Allow UI to request skipWaiting
                  window.addEventListener('sw:skip-waiting', function(){
                    if (reg.waiting) {
                      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                  });
                })
                .catch(function (err) {
                  console.error('SW registration failed:', err);
                });
            })();
          `}
        </Script>

        {/* ---------------- PWA install hooks — phones only ---------------- */}
        <Script id="pwa-install-hooks" strategy="afterInteractive">
          {`
            (function () {
              function isPhoneDevice() {
                var ua = (navigator.userAgent || "").toLowerCase();
                var uaDataMobile = navigator.userAgentData && navigator.userAgentData.mobile === true;
                var isPhoneUA = /(android.*mobile|iphone|ipod|windows phone|blackberry|iemobile)/i.test(ua);
                var isIPadLike = (/ipad|macintosh/i.test(navigator.userAgent) && 'ontouchend' in window);
                var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
                var maxSide = Math.min(screen.width || 0, screen.height || 0);
                var phoneSized = maxSide > 0 && maxSide <= 768; // include big phones / foldables
                return (uaDataMobile || isPhoneUA) && (coarse || phoneSized) && !isIPadLike;
              }

              if (!isPhoneDevice()) return;

              window.__pwa = window.__pwa || {
                deferredPrompt: null,
                canInstall: false,
                installed: false,
                isIOS: /iphone|ipod/i.test(navigator.userAgent),
                isInStandalone: window.matchMedia('(display-mode: standalone)').matches
                  || (window.navigator.standalone === true)
              };

              // Android Chrome
              window.addEventListener('beforeinstallprompt', function (e) {
                e.preventDefault(); // prevent mini-infobar
                window.__pwa.deferredPrompt = e;
                window.__pwa.canInstall = true;
                window.dispatchEvent(new CustomEvent('pwa:can-install'));
              });

              window.addEventListener('appinstalled', function () {
                window.__pwa.installed = true;
                try { localStorage.setItem('pwa-installed', '1'); } catch (e) {}
                window.dispatchEvent(new CustomEvent('pwa:installed'));
              });

              // iOS tip (no beforeinstallprompt)
              try {
                var alreadyInstalled = localStorage.getItem('pwa-installed') === '1';
                var suppressedUntil = parseInt(localStorage.getItem('pwa-ios-suppress-until') || '0', 10);
                var now = Date.now();
                if (!alreadyInstalled && window.__pwa.isIOS && !window.__pwa.isInStandalone && now > suppressedUntil) {
                  window.dispatchEvent(new CustomEvent('pwa:ios-tip'));
                }
              } catch (e) {}
            })();
          `}
        </Script>

        {/* Phone-only install banner component */}
        <InstallBanner />

        {children}
      </body>
    </html>
  );
}
