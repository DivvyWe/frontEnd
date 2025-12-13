// src/components/AppNav.js
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { FiUsers, FiUser, FiUserPlus, FiLogOut } from "react-icons/fi";
import NotificationBell from "@/components/NotificationBell";

const BRAND = "#84CC16";

/* ------------------------------ Logout cleanup (SW + cache + push) ------------------------------ */
async function performLogoutCleanup() {
  if (typeof window === "undefined") return;

  try {
    // 1) Unsubscribe from push notifications
    if ("serviceWorker" in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          regs.map(async (reg) => {
            try {
              const sub = await reg.pushManager.getSubscription();
              if (sub) await sub.unsubscribe();
            } catch {
              // ignore per-reg errors
            }
          })
        );
      } catch {
        // ignore
      }
    }

    // 2) Clear Cache Storage
    if ("caches" in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {
        // ignore
      }
    }

    // 3) Unregister all service workers (optional but keeps things clean per user)
    if ("serviceWorker" in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      } catch {
        // ignore
      }
    }
  } catch {
    // swallow any unexpected errors; logout should still proceed
  }
}

/* ------------------------------ Top (desktop) tab ------------------------------ */
function TopTab({ href, icon: Icon, label }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group relative inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
        ${
          active
            ? "text-slate-800 bg-[#84CC1615]"
            : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
        }`}
    >
      <Icon
        className={`h-5 w-5 transition-all duration-200 ${
          active
            ? "text-[#84CC16]"
            : "text-slate-400 group-hover:text-[#84CC16]"
        }`}
        aria-hidden
      />
      <span
        className={`transition-colors duration-200 ${
          active
            ? "text-slate-800"
            : "text-slate-600 group-hover:text-slate-800"
        }`}
      >
        {label}
      </span>

      <span
        aria-hidden
        className={`absolute left-1/2 -bottom-[6px] h-[3px] w-0 rounded-full transition-all duration-300 ease-out
        ${
          active
            ? "w-5 -translate-x-1/2 opacity-100 bg-[#84CC16]"
            : "opacity-0 group-hover:w-4 group-hover:-translate-x-1/2 group-hover:opacity-80 group-hover:bg-[#84CC16]"
        }`}
      />
    </Link>
  );
}

/* ------------------------------ Bottom (mobile) tab ------------------------------ */
function MobileTab({ href, icon: Icon, label }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2 no-underline hover:no-underline focus:no-underline"
    >
      <span
        aria-hidden
        className={`absolute top-0 h-0.5 w-5 rounded-b-full transition-all duration-300 ${
          active ? "bg-[#84CC16] opacity-100" : "opacity-0"
        }`}
      />
      <Icon
        className={`h-5 w-5 transition-all duration-200 ${
          active ? "text-[#84CC16] translate-y-[-1px]" : "text-slate-500"
        }`}
      />
      <span
        className={`text-[11px] transition-colors duration-200 ${
          active ? "text-slate-800" : "text-slate-500"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

/* ------------------------------ Click-outside hook ------------------------------ */
function useClickOutside(onClose) {
  const ref = useRef(null);
  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onClose]);
  return ref;
}

/* ------------------------------ Avatar dropdown (desktop) ------------------------------ */
function DesktopAvatarLogout({ me }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const initial = (me?.username?.[0] || "U").toUpperCase();
  const router = useRouter();

  const handleLogoutClick = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setOpen(false);

    try {
      // 1) Backend logout (Next API route or proxy)
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      }).catch(() => {});

      // 2) SW / push / cache cleanup
      await performLogoutCleanup();

      // 3) Clear token cookie (front-end managed)
      if (typeof window !== "undefined") {
        document.cookie = [
          "token=;",
          "Path=/",
          "Max-Age=0",
          "SameSite=Lax",
          window.location.protocol === "https:" ? "Secure" : null,
        ]
          .filter(Boolean)
          .join("; ");
      }

      // 4) Redirect to sign-in
      router.replace("/auth/signin");
      router.refresh?.();
    } catch (e) {
      console.error(e);
      alert("Could not log out. Please try again.");
      setLoggingOut(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-slate-700 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#84CC16]/50"
        title={me?.username || "You"}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 transition-all"
        >
          {/* Profile info */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-slate-700 font-semibold">
                {initial}
              </div>
              <div>
                <div className="text-sm font-medium text-slate-800">
                  {me?.username
                    ? me.username.charAt(0).toUpperCase() +
                      me.username.slice(1).toLowerCase()
                    : "User"}
                </div>
                <div className="text-xs text-slate-500 truncate max-w-[140px]">
                  {me?.email || "user@divsez.app"}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-slate-100">
            <button
              onClick={handleLogoutClick}
              disabled={loggingOut}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-red-50 transition-colors ${
                loggingOut ? "text-red-400 cursor-wait" : "text-red-600"
              }`}
            >
              <FiLogOut className="h-4 w-4" />
              {loggingOut ? "Logging out…" : "Log out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ AppNav ------------------------------ */
export default function AppNav({ me }) {
  return (
    <>
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* Left: logo + text */}
          <div className="flex items-center gap-2">
            <Link
              href="/groups"
              aria-label="Go to Groups"
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Image
                src="/icons/icon-192.png"
                alt="Divsez logo"
                width={36}
                height={36}
                priority
                className="h-9 w-9 rounded-lg"
              />
              <span className="flex items-baseline gap-1">
                <span className="text-xl font-semibold tracking-tight text-[#84CC16]">
                  Divsez
                </span>
                <span className="text-[8px] font-medium text-slate-400 uppercase tracking-wide">
                  Beta
                </span>
              </span>
            </Link>
          </div>

          {/* Desktop tabs */}
          <nav className="hidden md:flex items-center gap-2">
            <TopTab href="/groups" icon={FiUsers} label="Groups" />
            <TopTab href="/contacts" icon={FiUserPlus} label="Contacts" />
            <TopTab href="/profile" icon={FiUser} label="Profile" />
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <NotificationBell me={me} />
            <div className="hidden md:block">
              <DesktopAvatarLogout me={me} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom tabs (mobile only) */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 bg-white/90 backdrop-blur shadow-[0_-6px_20px_rgba(0,0,0,0.04)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
          <MobileTab href="/groups" icon={FiUsers} label="Groups" />
          <MobileTab href="/contacts" icon={FiUserPlus} label="Contacts" />
          <MobileTab href="/profile" icon={FiUser} label="Profile" />
        </div>
      </div>
    </>
  );
}
