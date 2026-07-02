// On-demand ISR revalidation, called by the Django CMS after content changes
// (apps/content/revalidation.py). Secret-protected; accepts either a list of
// paths or { all: true } to refresh the whole layout (nav/settings edits).
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { paths?: unknown; all?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  if (body.all === true) {
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, all: true });
  }

  const paths = (Array.isArray(body.paths) ? body.paths : [])
    .filter((p): p is string => typeof p === "string" && p.startsWith("/"))
    .slice(0, 100);

  for (const path of paths) revalidatePath(path);
  return NextResponse.json({ ok: true, revalidated: paths });
}
