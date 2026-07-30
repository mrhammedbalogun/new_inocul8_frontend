// Token custody for the studio. Browser JS never sees a JWT: tokens live in
// httpOnly cookies and are attached to Django calls server-side.
//
// Cookie paths are deliberately narrow — the studio shares a hostname with the
// public marketing site, so nothing is ever set at Path=/.
import { cookies } from "next/headers";

const API = process.env.API_URL ?? "https://api.inocul8.com.ng/api/v1";

export const ACCESS_COOKIE = "i8_studio_access";
export const REFRESH_COOKIE = "i8_studio_refresh";
/** Valueless presence marker so proxy.ts can tell "signed in" without ever
 *  seeing a token. It MUST have a different NAME from the refresh cookie:
 *  Next's cookie jar is keyed by name, so setting the same name twice with
 *  different paths overwrites rather than producing two Set-Cookie headers. */
export const SESSION_MARKER = "i8_studio_session";

const ACCESS_PATH = "/api/studio";
const REFRESH_PATH = "/api/studio/refresh";

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

export async function setSessionCookies(access: string, refresh: string) {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, access, { ...base, path: ACCESS_PATH, maxAge: 60 * 15 });
  jar.set(REFRESH_COOKIE, refresh, { ...base, path: REFRESH_PATH, maxAge: 60 * 60 * 24 * 14 });
  jar.set(SESSION_MARKER, "1", { ...base, path: "/studio", maxAge: 60 * 60 * 24 * 14 });
}

export async function clearSessionCookies() {
  const jar = await cookies();
  jar.delete({ name: ACCESS_COOKIE, path: ACCESS_PATH });
  jar.delete({ name: REFRESH_COOKIE, path: REFRESH_PATH });
  jar.delete({ name: SESSION_MARKER, path: "/studio" });
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API}/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const { access, refresh } = await res.json();
  await setSessionCookies(access, refresh);
  return access as string;
}

/** Read the current access token from the incoming request's cookie jar,
 *  without attempting a refresh. Returns undefined if absent. */
export async function readAccess(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(ACCESS_COOKIE)?.value;
}

// Single-flight: the autosave loop plus a second tab can otherwise fire
// concurrent refreshes, and with rotation the loser gets logged out mid-post.
let inFlight: Promise<string | null> | null = null;

export async function refreshAccess(): Promise<string | null> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const jar = await cookies();
    const refresh = jar.get(REFRESH_COOKIE)?.value;
    if (!refresh) return null;
    const res = await fetch(`${API}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    await setSessionCookies(data.access, data.refresh ?? refresh);
    return data.access as string;
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
