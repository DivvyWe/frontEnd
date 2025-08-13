// src/app/api/proxy/[...path]/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BASE = process.env.NEXT_PUBLIC_API_BASE;

const joinUrl = (arr = []) => arr.filter(Boolean).join("/");

async function handle(req, { params }, method) {
  if (!BASE)
    return NextResponse.json(
      { message: "API base not configured" },
      { status: 500 }
    );

  const rel = joinUrl(params.path);
  const { search } = new URL(req.url);
  const url = `${BASE}/${rel}${search}`;

  const token = (await cookies()).get("token")?.value;

  // start with original headers (keeps multipart/form-data boundaries, etc.)
  const headers = new Headers(req.headers);
  headers.set("accept", "application/json, */*");
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  if (token) headers.set("authorization", `Bearer ${token}`);

  const init = { method, headers, cache: "no-store" };
  if (method !== "GET" && method !== "HEAD") init.body = req.body; // stream body

  const upstream = await fetch(url, init);

  // pass through body & headers
  const resHeaders = new Headers(upstream.headers);
  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export const GET = (req, ctx) => handle(req, ctx, "GET");
export const POST = (req, ctx) => handle(req, ctx, "POST");
export const PUT = (req, ctx) => handle(req, ctx, "PUT");
export const PATCH = (req, ctx) => handle(req, ctx, "PATCH");
export const DELETE = (req, ctx) => handle(req, ctx, "DELETE");
