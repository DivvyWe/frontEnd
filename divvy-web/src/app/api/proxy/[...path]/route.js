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
    .map((p) => String(p).replace(/^\/+|\/+$/g, ""))
    .join("/");

async function handle(req, { params }, method) {
  if (!BASE) {
    return NextResponse.json(
      { message: "API base not configured" },
      { status: 500 }
    );
  }

  const rel = joinUrl(params?.path);
  const { search } = new URL(req.url);
  const url = `${BASE}/${rel}${search}`;

  const token = (await cookies()).get("token")?.value;

  const headers = new Headers(req.headers);
  headers.set("accept", "application/json, */*");
  headers.set("accept-encoding", "identity"); // avoid gzip issues in dev
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  headers.delete("cookie"); // don’t leak Next cookies downstream
  if (token) headers.set("authorization", `Bearer ${token}`);

  const init = {
    method,
    headers,
    cache: "no-store",
    redirect: "manual",
  };

  // ----- body handling (fixes “duplex option is required”)
  if (!["GET", "HEAD"].includes(method)) {
    const ct = headers.get("content-type") || "";

    if (ct.startsWith("multipart/form-data")) {
      // stream through; undici needs duplex when body is a stream
      init.body = req.body;
      // @ts-ignore - undici option
      init.duplex = "half";
    } else if (
      ct.includes("application/json") ||
      ct.includes("application/x-www-form-urlencoded") ||
      ct.includes("text/plain")
    ) {
      // buffer small bodies to avoid duplex requirement
      const bodyText = await req.text();
      init.body = bodyText;
      // content-length will be computed automatically
    } else {
      // fallback: stream & set duplex
      init.body = req.body;
      // @ts-ignore
      init.duplex = "half";
    }
  }
  // ----- end body handling

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
  if (!resHeaders.get("content-type"))
    resHeaders.set("content-type", "application/json; charset=utf-8");
  resHeaders.set("x-proxied-by", "next-proxy");

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
