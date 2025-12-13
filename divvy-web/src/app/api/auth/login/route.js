// src/app/api/auth/login/route.js
export const runtime = "nodejs"; // ensure Node runtime
export const dynamic = "force-dynamic"; // avoid caching in dev

import { NextResponse } from "next/server";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, ""); // no trailing slash

export async function POST(req) {
  try {
    if (!BASE) {
      return NextResponse.json(
        { message: "API base not configured" },
        { status: 500 }
      );
    }

    const payload = await req.json();

    // Forward to your real backend
    const upstream = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    // Be tolerant to non-JSON error bodies during local dev
    const ct = upstream.headers.get("content-type") || "";
    let body;
    try {
      body = ct.includes("application/json")
        ? await upstream.json()
        : { message: await upstream.text() };
    } catch {
      body = { message: upstream.statusText || "Upstream error" };
    }

    if (!upstream.ok) {
      // Bubble up backend status instead of throwing 500
      return NextResponse.json(body, { status: upstream.status });
    }

    // Extract token no matter how backend names it
    const token = body.token || body.accessToken || body.data?.token;
    if (!token) {
      return NextResponse.json(
        { message: "No token in response" },
        { status: 502 }
      );
    }

    // ✅ Set long-lived HttpOnly cookie, shared across subdomains in production
    const res = NextResponse.json({ ok: true, user: body.user ?? null });

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // ok for same-site subdomains (app.divsez.com <-> api.divsez.com)
      path: "/",
      domain: process.env.NODE_ENV === "production" ? ".divsez.com" : undefined,
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return res;
  } catch (err) {
    console.error("[api/auth/login] error:", err);
    return NextResponse.json({ message: "Login failed" }, { status: 500 });
  }
}
