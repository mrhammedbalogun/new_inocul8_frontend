import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/studio/session";

export async function POST() {
  await clearSessionCookies();
  return NextResponse.json({ ok: true });
}
