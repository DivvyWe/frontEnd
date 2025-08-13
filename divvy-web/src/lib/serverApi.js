// src/lib/serverApi.js
import { cookies } from "next/headers";

const BASE = process.env.NEXT_PUBLIC_API_BASE;

export async function serverApi(path, init = {}) {
  const token = (await cookies()).get("token")?.value;

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  // try parse json, fallback to empty
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }

  if (!res.ok) {
    const message = data?.message || "API error";
    throw new Error(message);
  }
  return data;
}
