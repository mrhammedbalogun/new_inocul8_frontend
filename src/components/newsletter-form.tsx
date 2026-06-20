"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    // TODO: POST to Django /api/leads/newsletter once backend is wired.
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-brand-500/15 px-5 py-3 text-sm text-brand-200">
        <Check className="size-4" /> You&apos;re subscribed — watch your inbox.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-md gap-2">
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
        className="flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-brand-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-400"
      >
        Subscribe <ArrowRight className="size-4" />
      </button>
    </form>
  );
}
