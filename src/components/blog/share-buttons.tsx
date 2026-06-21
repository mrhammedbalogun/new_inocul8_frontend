"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { site } from "@/lib/site";

export function ShareButtons({ slug, title }: { slug: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${site.url}/${slug}`;
  const text = encodeURIComponent(title);
  const enc = encodeURIComponent(url);

  const links = [
    { label: "Share on WhatsApp", href: `https://wa.me/?text=${text}%20${enc}`, short: "WhatsApp" },
    { label: "Share on X", href: `https://twitter.com/intent/tweet?text=${text}&url=${enc}`, short: "X" },
    { label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc}`, short: "Facebook" },
    { label: "Share on LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`, short: "LinkedIn" },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-ink-800">Share</span>
      {links.map((l) => (
        <a
          key={l.short}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={l.label}
          className="rounded-full border border-ink-900/10 px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
        >
          {l.short}
        </a>
      ))}
      <button
        type="button"
        onClick={copy}
        aria-label="Copy link"
        className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/10 px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
      >
        {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
