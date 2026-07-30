"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { studioFetch } from "@/lib/studio/client";

/** Persistent studio chrome: brand link back to the post list and sign-out.
 *  Rendered from the studio layout; hides itself on the login page. */
export function StudioTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (pathname === "/studio/login") return null;

  async function signOut() {
    setBusy(true);
    try {
      await studioFetch("logout", { method: "POST" });
    } catch {
      // Cookies may already be gone (expired session) — still leave.
    }
    // Full navigation, not router.push: drops all in-memory editor state so
    // the next sign-in starts clean.
    window.location.assign("/studio/login");
  }

  return (
    <header className="border-b border-ink-900/8 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/studio" className="font-display text-lg font-semibold text-ink-900">
          Inocul8 <span className="text-brand-600">Blog Studio</span>
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={busy}
          aria-busy={busy}
          className="rounded-lg border border-ink-900/12 px-3 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </header>
  );
}
