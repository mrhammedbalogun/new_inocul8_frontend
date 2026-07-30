import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { REFRESH_COOKIE, setSessionCookies } from "@/lib/studio/session";

const API = process.env.API_URL ?? "https://api.inocul8.com.ng/api/v1";

/**
 * The ONLY URL where the refresh token is ever transmitted.
 *
 * session.ts deliberately scopes the refresh cookie to Path=/api/studio/refresh
 * (F-T2's narrow-path rule: the long-lived token must not ride along on every
 * studio API call). The catch-all proxy's inline refresh-on-401 can therefore
 * never see it — for a request to /api/studio/posts/... the browser simply
 * doesn't send the cookie — which meant every session hard-died 15 minutes
 * after login when the access cookie's maxAge ran out. This endpoint is the
 * path that cookie scoping was always pointing at: the browser client calls it
 * on a 401 (see refreshSession() in src/lib/studio/client.ts), the refresh
 * cookie DOES match here, and the rotated pair is set back onto this response.
 *
 * On failure it returns 401 WITHOUT clearing cookies: a failed refresh in one
 * tab must not tear down a session another tab just successfully rotated.
 */
export async function POST(req: NextRequest) {
  // Same CSRF posture as the catch-all proxy (SameSite=Lax + these checks):
  // a cross-site POST must not be able to trigger a token rotation.
  const site = req.headers.get("sec-fetch-site");
  if ((site && site !== "same-origin") || req.headers.get("x-studio-request") !== "1") {
    return NextResponse.json({ detail: "Cross-site request blocked." }, { status: 403 });
  }

  const jar = await cookies();
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!refresh) {
    return NextResponse.json({ detail: "Session expired." }, { status: 401 });
  }

  const res = await fetch(`${API}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ detail: "Session expired." }, { status: 401 });
  }

  const data = await res.json();
  // ROTATE_REFRESH_TOKENS is on server-side; keep the old refresh only if the
  // response didn't include a rotated one.
  await setSessionCookies(data.access, data.refresh ?? refresh);
  return new NextResponse(null, { status: 204 });
}
