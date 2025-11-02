// src/app/api/proxy/[...path]/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const DEBUG = process.env.PROXY_DEBUG === "1";
const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const BASE = RAW_BASE.replace(/\/+$/, "");
const PROD = process.env.NODE_ENV === "production";

const joinUrl = (parts = []) =>
  (parts || [])
    .filter(Boolean)
    .map((p) => String(p).replace(/^\/+|\/+$/g, ""))
    .join("/");

function clearTokenHeaderValue() {
  // Path=/ so it clears everywhere. Add Secure in prod.
  return [
    "token=;",
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
    PROD ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");
}

function setTokenHeaderValue(token) {
  return [
    `token=${token}`,
    "Path=/",
    `Max-Age=${60 * 60 * 24 * 30}`, // 30 days
    "HttpOnly",
    "SameSite=Lax",
    PROD ? "Secure" : null,
  ]
    .filter(Boolean)
    .join("; ");
}

async function handle(req, ctx, method) {
  if (!BASE) {
    return NextResponse.json(
      { message: "API base not configured" },
      { status: 500 }
    );
  }

  // params can be a Promise in route handlers — await it
  const p = await ctx?.params;
  const segs = Array.isArray(p?.path) ? p.path : [p?.path].filter(Boolean);
  const rel = joinUrl(segs);

  const { search } = new URL(req.url);
  const url = `${BASE}/${rel}${search}`;

  // Read token cookie from Next side
  const token = (await cookies()).get("token")?.value;

  // Prepare headers to upstream
  const headers = new Headers(req.headers);
  headers.set("accept", "application/json, */*");
  headers.set("accept-encoding", "identity"); // avoid gzip issues in dev
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  headers.delete("cookie"); // don't forward Next cookies
  if (token) headers.set("authorization", `Bearer ${token}`);

  const init = {
    method,
    headers,
    cache: "no-store",
    redirect: "manual",
  };

  // ----- Body handling (covers multipart/streams) -----
  if (!["GET", "HEAD"].includes(method)) {
    const ct = headers.get("content-type") || "";

    if (ct.startsWith("multipart/form-data")) {
      init.body = req.body;
      // @ts-ignore (undici)
      init.duplex = "half";
    } else if (
      ct.includes("application/json") ||
      ct.includes("application/x-www-form-urlencoded") ||
      ct.includes("text/plain")
    ) {
      const bodyText = await req.text();
      init.body = bodyText;
    } else {
      // Fallback: stream body through
      init.body = req.body;
      // @ts-ignore (undici)
      init.duplex = "half";
    }
  }
  // ----- End body handling -----

  if (DEBUG) console.log("[proxy] →", method, url, "hasToken:", !!token);

  let upstream;
  try {
    upstream = await fetch(url, init);
  } catch (e) {
    if (DEBUG) console.error("[proxy] fetch error", method, url, e);
    return NextResponse.json(
      { message: "Upstream error", detail: e?.message || "fetch failed" },
      { status: 502 }
    );
  }

  // --- Special-case: login should set HttpOnly cookie on our domain ---
  // Matches POST to .../auth/login (your backend login route)
  if (method === "POST" && /(^|\/)auth\/login$/.test(rel)) {
    // Read upstream body once
    const raw = await upstream.text();
    if (!upstream.ok) {
      // Bubble up error payload/status as-is
      return new NextResponse(
        raw || JSON.stringify({ message: "Login failed" }),
        {
          status: upstream.status,
          headers: {
            "content-type":
              upstream.headers.get("content-type") ||
              "application/json; charset=utf-8",
          },
        }
      );
    }

    // Parse JSON and set cookie if token present
    try {
      const data = JSON.parse(raw || "{}");
      const tokenFromUpstream = data?.token;
      const user = data?.user ?? null;

      if (tokenFromUpstream) {
        const res = NextResponse.json(
          { ok: true, user, token: tokenFromUpstream },
          { status: 200 }
        );
        res.headers.set("set-cookie", setTokenHeaderValue(tokenFromUpstream));
        res.headers.set("x-proxied-by", "next-proxy");
        return res;
      }

      // No token returned – treat as error for the client
      return NextResponse.json(
        { message: "No token returned from server" },
        { status: 502 }
      );
    } catch {
      return NextResponse.json(
        { message: "Invalid login response" },
        { status: 502 }
      );
    }
  }
  // --- End special-case login ---

  if (DEBUG)
    console.log(
      "[proxy] ←",
      upstream.status,
      upstream.headers.get("content-type") || "(no content-type)"
    );

  // Copy/sanitize headers
  const resHeaders = new Headers(upstream.headers);
  resHeaders.delete("content-encoding");
  resHeaders.delete("content-length");
  if (!resHeaders.get("content-type")) {
    resHeaders.set("content-type", "application/json; charset=utf-8");
  }
  resHeaders.set("x-proxied-by", "next-proxy");

  // Forward backend Set-Cookie if present (e.g., other flows)
  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) {
    resHeaders.set("set-cookie", setCookie);
  }

  // If upstream says token is invalid/expired, clear our cookie immediately
  if (upstream.status === 401 || upstream.status === 403) {
    const resp = new NextResponse(upstream.body, {
      status: upstream.status,
      headers: resHeaders,
    });
    resp.headers.append("set-cookie", clearTokenHeaderValue());
    return resp;
  }

  // Normal pass-through
  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export const GET = (req, ctx) => handle(req, ctx, "GET");
export const HEAD = (req, ctx) => handle(req, ctx, "HEAD");
export const POST = (req, ctx) => handle(req, ctx, "POST");
export const PUT = (req, ctx) => handle(req, ctx, "PUT");
export const PATCH = (req, ctx) => handle(req, ctx, "PATCH");
export const DELETE = (req, ctx) => handle(req, ctx, "DELETE");
