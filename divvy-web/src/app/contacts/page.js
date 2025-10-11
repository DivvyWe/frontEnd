// app/contacts/page.js
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { headers, cookies } from "next/headers";
import ContactsClient from "@/components/contacts/ContactsClient";

function getOrigin(h) {
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

async function fetchWithCookies(url) {
  const h = await headers();
  const origin = getOrigin(h);
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const res = await fetch(`${origin}${url}`, {
    headers: { Accept: "application/json", Cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function ContactsPage() {
  // These awaits cause the segment to suspend -> app/contacts/loading.js shows.
  const me = await fetchWithCookies("/api/proxy/auth/me");
  const first = await fetchWithCookies(
    "/api/proxy/contacts/user/contacts?page=1&limit=30&sort=recent"
  );

  return (
    <ContactsClient
      me={me}
      initialContacts={first?.contacts || []}
      initialTotal={first?.total || 0}
      initialPage={first?.page || 1}
      initialPages={first?.pages || 1}
      limit={30}
      initialSort="recent"
      initialQ=""
    />
  );
}
