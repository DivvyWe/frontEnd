// src/app/profile/page.js
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { headers, cookies } from "next/headers";
import ProfileClient from "@/components/profile/ProfileClient";

function getOrigin(h) {
  // Prefer explicit env when present (use your deploy URL)
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/+$/, "");

  const proto =
    h.get("x-forwarded-proto") || h.get("x-forwarded-protocol") || "https";
  const host =
    h.get("x-forwarded-host") ||
    h.get("host") ||
    process.env.NEXT_PUBLIC_SITE_HOST ||
    "localhost:3000";

  return `${proto}://${host}`;
}

async function getMe() {
  const h = await headers();
  const origin = getOrigin(h);

  // forward all cookies so the API can auth the request
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const res = await fetch(`${origin}/api/proxy/auth/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    // You can throw to hit an error boundary, or redirect to signin, etc.
    // throw new Error("Failed to fetch profile");
    return null;
  }
  return res.json();
}

export default async function ProfilePage() {
  // This await causes the route to suspend → app/profile/loading.js shows on client navigations.
  const me = await getMe();
  return <ProfileClient initialMe={me} />;
}
