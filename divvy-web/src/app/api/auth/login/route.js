// src/app/api/auth/login/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  const body = await req.json().catch(() => ({}));

  const upstream = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE}/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return NextResponse.json(data, { status: upstream.status });

  const isProd = process.env.NODE_ENV === "production";
  const res = NextResponse.json({ user: data.user });

  res.cookies.set("token", data.token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
  });

  return res;
}
