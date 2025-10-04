// src/components/AppNav.js
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { FiUsers, FiUser, FiUserPlus } from "react-icons/fi";
import LogoutButton from "@/components/LogoutButton";
import NotificationBell from "@/components/NotificationBell";

function TopTab({ href, icon: Icon, label }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`relative inline-flex items-center gap-2 px-3 py-2 text-sm transition no-underline hover:no-underline focus:no-underline
        ${active ? "text-slate-700" : "text-slate-600 hover:text-slate-700"}`}
    >
      <Icon
        className={`h-5 w-5 ${active ? "text-[#84CC16]" : "text-slate-500"}`}
        aria-hidden
      />
      <span
        className={
          active ? "text-slate-700" : "text-slate-600 hover:text-slate-700"
        }
      >
        {label}
      </span>
      <span
        aria-hidden
        className={`absolute inset-x-2 -bottom-[6px] h-0.5 rounded-full ${
          active ? "bg-[#84CC16]" : "bg-transparent"
        }`}
      />
    </Link>
  );
}

function MobileTab({ href, icon: Icon, label }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center justify-center gap-1 py-2 no-underline hover:no-underline focus:no-underline"
      aria-label={label}
    >
      <Icon
        className={`h-5 w-5 ${active ? "text-[#84CC16]" : "text-slate-500"}`}
      />
      <span
        className={`text-[11px] ${
          active ? "text-slate-700" : "text-slate-500"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

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

/** Desktop avatar: clicking shows a tiny menu with just Logout */
function DesktopAvatarLogout({ me }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const initial = (me?.username?.[0] || "U").toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-slate-700 text-sm font-semibold"
        title={me?.username || "You"}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          <div className="px-2 py-1">
            <LogoutButton />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppNav({ me }) {
  return (
    <>
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* Left: logo */}
          <div className="flex items-center gap-3">
            <Link href="/groups" aria-label="Go to Groups" className="block">
              <Image
                src="/logo.png"
                alt="DivSez logo"
                width={36}
                height={36}
                priority
                className="h-9 w-auto rounded-lg"
                sizes="(min-width: 768px) 36px, 100vw"
              />
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
