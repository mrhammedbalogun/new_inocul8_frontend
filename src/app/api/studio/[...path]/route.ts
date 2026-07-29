import { NextRequest, NextResponse } from "next/server";
import { readAccess, refreshAccess } from "@/lib/studio/session";

const API = process.env.API_URL ?? "https://api.inocul8.com.ng/api/v1";

/** Cookie auth reopens CSRF; SameSite=Lax plus these two checks close it. */
function rejectsCrossSite(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return false;
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return true;
  if (req.headers.get("x-studio-request") !== "1") return true;
  return false;
}

async function forward(req: NextRequest, path: string[], token: string) {
  const url = `${API}/studio/${path.join("/")}/${req.nextUrl.search}`;
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  // The body below is forwarded as the exact raw bytes already received (see arrayBuffer()
  // below), not reconstructed as a new FormData — so for multipart requests those bytes are
  // already encoded against the boundary the *original* client fetch chose, and that boundary
  // only appears in its Content-Type header. Skipping this header for multipart (as a previous
  // version of this function did, on the theory that "fetch sets its own boundary") strips the
  // only place that boundary is recorded, so Django receives a bodiless-looking multipart
  // request with an empty Content-Type and rejects it with 415. Always forward it verbatim.
  const contentType = req.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();
  return fetch(url, { method: req.method, headers, body, cache: "no-store" });
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (rejectsCrossSite(req)) {
    return NextResponse.json({ detail: "Cross-site request blocked." }, { status: 403 });
  }
  const { path } = await ctx.params;
  let token = await readAccess();

  if (!token) {
    token = (await refreshAccess()) ?? undefined;
    if (!token) return NextResponse.json({ detail: "Session expired." }, { status: 401 });
  }

  let res = await forward(req, path, token);
  if (res.status === 401) {
    const fresh = await refreshAccess();
    if (!fresh) return NextResponse.json({ detail: "Session expired." }, { status: 401 });
    res = await forward(req, path, fresh);
  }

  const payload = await res.arrayBuffer();
  return new NextResponse(payload, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
