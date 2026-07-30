"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// `useSearchParams` forces client-side rendering of everything below it
// during a static build unless wrapped in Suspense — see
// node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md.
// Production `next build` fails without this boundary.
export default function StudioLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFallback() {
  return <div className="grid min-h-screen place-items-center px-4" aria-hidden="true" />;
}

/** Only follow `?next=` when it's a same-site path — never an absolute or
 *  protocol-relative URL. Without this an attacker could send a staff member
 *  a `/studio/login?next=https://evil.example` phishing link that, after a
 *  real successful login, bounces them straight off the site. */
function safeNext(raw: string | null): string {
  if (!raw) return "/studio";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/studio";
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/studio/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Studio-Request": "1" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
      }),
    });
    if (!res.ok) {
      setBusy(false);
      setError("Incorrect username or password.");
      return;
    }
    router.replace(safeNext(params.get("next")));
    // The proxy gate checks a marker cookie set by the BFF above; refresh so
    // it re-evaluates with that cookie now present instead of redirecting
    // straight back to /studio/login.
    router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <form
        onSubmit={onSubmit}
        method="post"
        aria-busy={busy}
        className="w-full max-w-sm rounded-2xl border border-ink-900/8 bg-white p-8 shadow-soft"
      >
        <h1 className="font-display text-2xl font-semibold">Blog Studio</h1>
        <p className="mt-1 text-sm text-muted">Sign in to write and publish.</p>

        <label className="mt-6 block text-sm font-medium" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          disabled={busy}
          className="mt-1 w-full rounded-lg border border-ink-900/12 px-3 py-2 disabled:opacity-60"
        />

        <label className="mt-4 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={busy}
          className="mt-1 w-full rounded-lg border border-ink-900/12 px-3 py-2 disabled:opacity-60"
        />

        <div role="alert" aria-live="assertive" className="mt-4 min-h-5 text-sm text-red-600">
          {error}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-2 w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
