// src/app/api/auth/change-password/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_BASE =
  process.env.NEXT_PUBLIC_API_BASE || // <- add this line
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  process.env.BACKEND_URL; // e.g., https://your-backend.com

export async function POST(req) {
  try {
    if (!BACKEND_BASE) {
      return NextResponse.json(
        { message: "Server misconfigured: BACKEND_BASE not set" },
        { status: 500 }
      );
    }

    const token = cookies().get("token")?.value;
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    // NOTE: Your env already ends with /api, so /auth/... is correct here.
    const upstream = await fetch(`${BACKEND_BASE}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await upstream.text();
    const contentType =
      upstream.headers.get("Content-Type") || "application/json";

    if (!upstream.ok) {
      try {
        const j = text ? JSON.parse(text) : {};
        return NextResponse.json(j, { status: upstream.status });
      } catch {
        return new NextResponse(text || "Change password failed", {
          status: upstream.status,
          headers: { "Content-Type": contentType },
        });
      }
    }

    try {
      const j = text ? JSON.parse(text) : {};
      return NextResponse.json(j, { status: 200 });
    } catch {
      return new NextResponse(text, {
        status: 200,
        headers: { "Content-Type": contentType },
      });
    }
  } catch (err) {
    console.error("[proxy/change-password] error:", err);
    return NextResponse.json(
      { message: "Proxy error while changing password" },
      { status: 500 }
    );
  }
}
