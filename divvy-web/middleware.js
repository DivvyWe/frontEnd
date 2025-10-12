// middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  const token = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;

  console.log("[mw] path:", pathname, "hasToken:", !!token);

  if (pathname.startsWith("/auth")) {
    if (token) {
      const url = req.nextUrl.clone();
      url.pathname = "/groups";
      console.log("[mw] redirect -> /groups");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  return NextResponse.next();
}

export const config = { matcher: ["/auth/:path*"] };
