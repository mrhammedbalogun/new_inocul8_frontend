// Contact-form proxy: the browser POSTs here (same-origin), and we forward to
// the Django endpoint server-side. Keeps the API call off the client, avoids
// CORS, and passes the real visitor IP through for rate-limiting/storage.
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_URL ?? "https://api.inocul8.com.ng/api/v1";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, detail: "Invalid request." }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "";

  try {
    const res = await fetch(`${API_BASE}/contact/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(ip ? { "X-Forwarded-For": ip } : {}),
        "User-Agent": req.headers.get("user-agent") ?? "",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail =
        res.status === 429
          ? "Too many messages sent. Please try again later, or reach us on WhatsApp."
          : (data as { detail?: string }).detail || "Something went wrong. Please try again.";
      return NextResponse.json({ ok: false, detail }, { status: res.status });
    }
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { ok: false, detail: "We couldn't reach our server. Please try WhatsApp or call us." },
      { status: 502 }
    );
  }
}
