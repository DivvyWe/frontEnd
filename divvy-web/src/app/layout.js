// app/layout.js
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PushClickHandler from "@/components/push/PushClickHandler";
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

// ✅ tiny client-only inlined component
function PushInitClient() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => console.error("SW registration failed:", err));
  }
  return null;
}

export const metadata = {
  title: { default: "Divvy – Split & Track", template: "%s · Divvy" },
  description: "Easily split and track group expenses with friends.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        {/* 🔔 Register SW globally */}
        <PushInitClient />
        <PushClickHandler />
        {children}
      </body>
    </html>
  );
}
