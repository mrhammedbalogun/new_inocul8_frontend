"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";

type Status = "idle" | "sending" | "done" | "error";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || status === "sending") return;
    const honeypot = String(new FormData(e.currentTarget).get("website") || "");
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // ContactMessage requires name/phone/message; label them so
          // newsletter signups are easy to spot and filter in the admin.
          name: "Newsletter subscriber",
          phone: "n/a",
          service: "Newsletter",
          message: `Newsletter signup from the website footer: ${email}`,
          email,
          website: honeypot,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(data.detail || "Something went wrong. Please try again.");
      }
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-2 rounded-full bg-brand-500/15 px-5 py-3 text-sm text-brand-200" role="status">
        <Check className="size-4" /> You&apos;re subscribed — watch your inbox.
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <form onSubmit={onSubmit} className="flex gap-2">
        {/* Honeypot — hidden from real users, bots fill it and get rejected. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          aria-label="Email address"
          className="h-12 w-full rounded-full border border-white/15 bg-white/10 px-5 text-sm text-white placeholder:text-white/40 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-brand-500 px-5 text-sm font-semibold text-brand-950 transition-colors hover:bg-brand-400 disabled:opacity-60"
        >
          {status === "sending" ? <Loader2 className="size-4 animate-spin" /> : <>Subscribe <ArrowRight className="size-4" /></>}
        </button>
      </form>
      {status === "error" && (
        <p className="mt-2 text-xs text-accent-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
