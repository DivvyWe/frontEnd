import { NextResponse } from "next/server";

export async function POST(req) {
  const api = process.env.NEXT_PUBLIC_API_BASE;
  if (!api) {
    return NextResponse.json(
      { message: "API base not configured" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { username, password } = body;
  const email = body.email ?? undefined;
  const phone = body.phone ?? undefined;

  // 1) Register on backend
  const regRes = await fetch(`${api}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, email, phone }),
  });

  // robust pass-through of backend errors (handles plain text or JSON)
  const regRaw = await regRes.text();
  const regData = (() => {
    try {
      return JSON.parse(regRaw);
    } catch {
      return { message: regRaw };
    }
  })();

  if (!regRes.ok) {
    return NextResponse.json(regData, { status: regRes.status });
  }

  // 2) Try token from register; if absent, login
  let token = regData?.token;
  let user = regData?.user;

  if (!token) {
    const loginRes = await fetch(`${api}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, ...(email ? { email } : { phone }) }),
    });

    const loginRaw = await loginRes.text();
    const loginData = (() => {
      try {
        return JSON.parse(loginRaw);
      } catch {
        return { message: loginRaw };
      }
    })();
    if (loginRes.ok) {
      token = loginData?.token;
      user = loginData?.user || user;
    }
  }

  // 3) If no token, return success without cookie (user can sign in)
  if (!token) {
    return NextResponse.json({
      user: user ?? null,
      message: "Registered successfully. Please sign in.",
    });
  }

  // 4) Set long-lived auth cookie (1 year)
  const isProd = process.env.NODE_ENV === "production";
  const res = NextResponse.json({ user: user ?? null });

  res.cookies.set("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return res;
}
