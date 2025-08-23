// src/lib/api.js
import { headers, cookies } from "next/headers";

async function siteBase() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;
}

function join(a, b) {
  return `${a.replace(/\/+$/, "")}/${b.replace(/^\/+/, "")}`;
}

export async function apiGET(path, init = {}) {
  const base = await siteBase();
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return fetch(join(base, `/api/proxy/${path}`), {
    ...init,
    method: "GET",
    headers: { ...(init.headers || {}), Cookie: cookieHeader },
    cache: "no-store",
  });
}

export async function apiJSON(method, path, body, init = {}) {
  const base = await siteBase();
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return fetch(join(base, `/api/proxy/${path}`), {
    ...init,
    method,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      Cookie: cookieHeader,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
}
