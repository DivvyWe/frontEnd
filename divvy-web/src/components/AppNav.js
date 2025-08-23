// src/components/AppNav.js
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiHome, FiUsers, FiList, FiSettings } from "react-icons/fi";
import LogoutButton from "@/components/LogoutButton";

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
        className={`${
          active ? "text-slate-700" : "text-slate-600 hover:text-slate-700"
        }`}
      >
        {label}
      </span>
      {/* subtle active underline */}
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

export default function AppNav({ me }) {
  const initial = (me?.username?.[0] || "U").toUpperCase();

  return (
    <>
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#84CC16] text-white font-bold">
              D
            </div>
            <span className="text-base font-semibold text-slate-700">
              DivIt
            </span>
          </div>

          {/* Desktop tabs */}
          <nav className="hidden md:flex items-center gap-2">
            <TopTab href="/dashboard" icon={FiHome} label="Dashboard" />
            <TopTab href="/groups" icon={FiUsers} label="Groups" />
            <TopTab href="/expenses" icon={FiList} label="Expenses" />
            <TopTab href="/settings" icon={FiSettings} label="Settings" />
          </nav>

          <div className="flex items-center gap-3">
            <div
              className="grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-slate-700 text-sm font-semibold"
              title={me?.username || "You"}
            >
              {initial}
            </div>
            <div className="hidden md:block">
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom tabs (mobile) */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 bg-white/90 backdrop-blur shadow-[0_-6px_20px_rgba(0,0,0,0.04)] md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
          <MobileTab href="/dashboard" icon={FiHome} label="Home" />
          <MobileTab href="/groups" icon={FiUsers} label="Groups" />
          <MobileTab href="/expenses" icon={FiList} label="Expenses" />
          <MobileTab href="/settings" icon={FiSettings} label="Settings" />
        </div>
      </div>
    </>
  );
}
