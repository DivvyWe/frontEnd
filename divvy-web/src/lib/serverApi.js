// src/lib/serverApi.js
import { cookies } from "next/headers";

const BASE = process.env.NEXT_PUBLIC_API_BASE;
if (!BASE) {
  // Fail fast on misconfig
  // (You can remove this if you prefer silent fallback.)
  throw new Error("NEXT_PUBLIC_API_BASE is not set");
}

export async function serverApi(path, init = {}) {
  const token = (await cookies()).get("token")?.value;

  const method = (init.method || "GET").toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  // Build headers without forcing Content-Type on GET/HEAD
  const headers = {
    ...(init.headers || {}),
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    method,
    headers,
    cache: "no-store",
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore non-JSON responses
  }

  if (!res.ok) {
    const msg = data?.message || `API error ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
