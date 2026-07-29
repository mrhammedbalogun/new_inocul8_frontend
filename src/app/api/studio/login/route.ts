import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/studio/session";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const access = await login(username, password);
  if (!access) {
    return NextResponse.json({ detail: "Incorrect username or password." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
