// app/layout.js
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import PushClickHandler from "@/components/push/PushClickHandler";
import InstallBanner from "@/components/pwa/InstallBanner"; // ⬅️ show the “Install app” popup

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
  title: { default: "Divvy – Split & Track", template: "%s · Divvy" },
  description: "Easily split and track group expenses with friends.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#84CC16" },
    { media: "(prefers-color-scheme: dark)", color: "#84CC16" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Divvy",
  },
  other: {
    "format-detection": "telephone=no",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        <PushClickHandler />

        {/* SW registration + update hooks */}
        <Script id="sw-register" strategy="afterInteractive">
          {`
            (function(){
              if (!('serviceWorker' in navigator)) return;

              navigator.serviceWorker.register('/sw.js', { scope: '/' })
                .then(function(reg){
                  // keep a reference (optional)
                  window.__swReg = reg;

                  // if there's already a waiting worker, surface it
                  if (reg.waiting) {
                    window.dispatchEvent(new CustomEvent('sw:update-available', { detail: { reg } }));
                  }

                  // listen for new installs
                  reg.addEventListener('updatefound', function () {
                    var sw = reg.installing;
                    if (!sw) return;
                    sw.addEventListener('statechange', function () {
                      if (sw.state === 'installed') {
                        // controller is present -> update available; otherwise it's first install
                        if (navigator.serviceWorker.controller) {
                          window.dispatchEvent(new CustomEvent('sw:update-available', { detail: { reg } }));
                        } else {
                          window.dispatchEvent(new CustomEvent('sw:ready', { detail: { reg } }));
                        }
                      }
                    });
                  });

                  // when the new SW takes control
                  navigator.serviceWorker.addEventListener('controllerchange', function(){
                    window.dispatchEvent(new CustomEvent('sw:updated'));
                  });

                  // allow UI to request skipWaiting programmatically
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

        {/* PWA install hooks (Android prompt + iOS tip) */}
        <Script id="pwa-install-hooks" strategy="afterInteractive">
          {`
            (function () {
              window.__pwa = window.__pwa || {
                deferredPrompt: null,
                canInstall: false,
                installed: false,
                isIOS: /iphone|ipad|ipod/i.test(navigator.userAgent),
                isInStandalone: window.matchMedia('(display-mode: standalone)').matches
                  || (window.navigator.standalone === true)
              };

              window.addEventListener('beforeinstallprompt', function (e) {
                e.preventDefault();
                window.__pwa.deferredPrompt = e;
                window.__pwa.canInstall = true;
                window.dispatchEvent(new CustomEvent('pwa:can-install'));
              });

              window.addEventListener('appinstalled', function () {
                window.__pwa.installed = true;
                try { localStorage.setItem('pwa-installed', '1'); } catch (e) {}
                window.dispatchEvent(new CustomEvent('pwa:installed'));
              });

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

        {/* ⚡ Install banner (Android prompt + iOS instructions) */}
        <InstallBanner />

        {children}
      </body>
    </html>
  );
}
