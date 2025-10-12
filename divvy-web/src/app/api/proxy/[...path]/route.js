// src/app/api/proxy/[...path]/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const DEBUG = process.env.PROXY_DEBUG === "1";
const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const BASE = RAW_BASE.replace(/\/+$/, "");

const joinUrl = (parts = []) =>
  (parts || [])
    .filter(Boolean)
    .map((p) => String(p).replace(/^\/+|\/+$/g, "")) // trim slashes on each part
    .join("/");

async function handle(req, ctx, method) {
  if (!BASE) {
    return NextResponse.json(
      { message: "API base not configured" },
      { status: 500 }
    );
  }

  // params can be a Promise in this handler
  const p = await ctx?.params;
  const segs = Array.isArray(p?.path) ? p.path : [p?.path].filter(Boolean);
  const rel = joinUrl(segs);

  const { search } = new URL(req.url);
  // ✅ Always forward to /api/... on the backend
  const url = `${BASE}/api/${rel}${search}`;

  const token = (await cookies()).get("token")?.value;

  const headers = new Headers(req.headers);
  headers.set("accept", "application/json, */*");
  headers.set("accept-encoding", "identity"); // avoid gzip decode issues in dev
  // Don’t forward hop-by-hop / framework headers
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  // Don’t leak Next.js cookies to backend
  headers.delete("cookie");

  if (token) headers.set("authorization", `Bearer ${token}`);

  const init = {
    method,
    headers,
    cache: "no-store",
    redirect: "manual",
  };

  // ----- body handling -----
  if (!["GET", "HEAD"].includes(method)) {
    const ct = headers.get("content-type") || "";

    if (ct.includes("multipart/form-data")) {
      // Keep the stream + duplex for form-data
      init.body = req.body;
      // @ts-ignore (undici extension)
      init.duplex = "half";
    } else if (
      ct.includes("application/json") ||
      ct.includes("application/x-www-form-urlencoded") ||
      ct.includes("text/plain")
    ) {
      const bodyText = await req.text();
      init.body = bodyText;
    } else if (ct) {
      // Any other content-type: pass-through the stream
      init.body = req.body;
      // @ts-ignore
      init.duplex = "half";
    }
  }
  // ----- end body handling -----

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

  if (DEBUG)
    console.log(
      "[proxy] ←",
      upstream.status,
      upstream.headers.get("content-type") || "(no content-type)"
    );

  const resHeaders = new Headers(upstream.headers);
  resHeaders.delete("content-encoding");
  resHeaders.delete("content-length");
  if (!resHeaders.get("content-type")) {
    // Default for JSON APIs; binaries (files/images) usually set their own
    resHeaders.set("content-type", "application/json; charset=utf-8");
  }
  resHeaders.set("x-proxied-by", "next-proxy");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}

// Preflight (rarely needed when same-origin, but safe to include)
export async function OPTIONS() {
  const res = NextResponse.json({}, { status: 200 });
  res.headers.set(
    "Access-Control-Allow-Origin",
    process.env.NEXT_PUBLIC_APP_ORIGIN || "*"
  );
  res.headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.headers.set("Access-Control-Allow-Credentials", "true");
  return res;
}

export const GET = (req, ctx) => handle(req, ctx, "GET");
export const HEAD = (req, ctx) => handle(req, ctx, "HEAD");
export const POST = (req, ctx) => handle(req, ctx, "POST");
export const PUT = (req, ctx) => handle(req, ctx, "PUT");
export const PATCH = (req, ctx) => handle(req, ctx, "PATCH");
export const DELETE = (req, ctx) => handle(req, ctx, "DELETE");
