// middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  const url = req.nextUrl;
  const { pathname, searchParams } = url;

  // Read new cookie first, fallback to legacy name (one release window)
  const token =
    req.cookies.get("dsz_token")?.value ||
    req.cookies.get("token")?.value ||
    "";

  // Only handle /auth/* routes (as per matcher below)
  if (!pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  // Always allow signout route through
  if (pathname.startsWith("/auth/signout")) {
    return NextResponse.next();
  }

  // If user is already authenticated, bounce them away from /auth/*
  if (token) {
    // Optional ?next=/safe/path — sanitize to avoid open redirects
    const nextParam = searchParams.get("next") || "";
    let dest = "/groups";
    if (
      nextParam &&
      nextParam.startsWith("/") && // must be relative
      !nextParam.startsWith("//") && // no scheme-relative
      !nextParam.toLowerCase().startsWith("/auth") // avoid redirecting to auth again
    ) {
      dest = nextParam;
    }

    const to = url.clone();
    to.pathname = dest;
    to.search = ""; // drop original query to avoid loops
    return NextResponse.redirect(to);
  }

  // No token → allow access to /auth/*
  return NextResponse.next();
}

export const config = {
  matcher: ["/auth/:path*"],
};
