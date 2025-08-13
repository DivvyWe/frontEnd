"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  FiMenu,
  FiX,
  FiHome,
  FiUsers,
  FiList,
  FiSettings,
} from "react-icons/fi";
import LogoutButton from "@/components/LogoutButton";

function NavItem({ href, icon: Icon, label, onClick }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  const base =
    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition";
  return (
    <Link
      href={href}
      onClick={onClick}
      className={
        active
          ? `${base} bg-[#84CC16] text-white`
          : `${base} text-slate-700 hover:bg-slate-100`
      }
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}

export default function AppNav({ me }) {
  const [open, setOpen] = useState(false);
  const initial = (me?.username?.[0] || "U").toUpperCase();

  const Menu = ({ onItem }) => (
    <nav className="flex flex-col gap-1">
      <NavItem
        href="/dashboard"
        icon={FiHome}
        label="Dashboard"
        onClick={onItem}
      />
      <NavItem href="/groups" icon={FiUsers} label="Groups" onClick={onItem} />
      <NavItem
        href="/expenses"
        icon={FiList}
        label="Expenses"
        onClick={onItem}
      />
      <NavItem
        href="/settings"
        icon={FiSettings}
        label="Settings"
        onClick={onItem}
      />
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
          >
            <FiMenu className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#84CC16] text-white font-bold">
              D
            </div>
            <span className="text-base font-semibold">DivIt</span>
          </div>

          <div
            className="grid h-8 w-8 place-items-center rounded-full bg-slate-200 text-slate-700 text-sm font-semibold"
            title={me?.username || "You"}
          >
            {initial}
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-20 w-64 flex-col border-r bg-white p-4">
        <div className="mb-4 flex items-center gap-3 px-1">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#84CC16] text-white font-bold">
            D
          </div>
          <span className="text-lg font-semibold">DivIt</span>
        </div>

        <Menu />

        <div className="mt-auto pt-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl border p-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-slate-700 font-semibold">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {me?.username}
              </p>
              <p className="truncate text-xs text-slate-500">
                {me?.email || me?.phone}
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-30">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl p-4 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#84CC16] text-white font-bold">
                  D
                </div>
                <span className="text-base font-semibold">DivIt</span>
              </div>
              <button
                aria-label="Close menu"
                className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
                onClick={() => setOpen(false)}
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            <Menu onItem={() => setOpen(false)} />

            <div className="mt-auto pt-4">
              <div className="mb-3 flex items-center gap-3 rounded-xl border p-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-slate-700 font-semibold">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {me?.username}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {me?.email || me?.phone}
                  </p>
                </div>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
