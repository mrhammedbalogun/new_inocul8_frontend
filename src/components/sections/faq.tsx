"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";
import { HOME_CONTENT_FALLBACK, HOME_FALLBACK, type HomeContent, type HomeFaq } from "@/lib/home";
import { whatsappHref } from "@/lib/site";

export function Faq({
  content = HOME_CONTENT_FALLBACK,
  faqs = HOME_FALLBACK.faqs,
}: {
  content?: HomeContent;
  faqs?: HomeFaq[];
}) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="py-20 sm:py-24">
      <Container className="max-w-3xl">
        <SectionHeading
          eyebrow={content.faq_eyebrow}
          title={content.faq_title}
          description={content.faq_description}
        />

        <div className="mt-12 divide-y divide-ink-900/10 rounded-2xl border border-ink-900/10 bg-white">
          {faqs.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-medium text-ink-900">{item.q}</span>
                  <Plus
                    className={cn(
                      "size-5 shrink-0 text-brand-600 transition-transform duration-300",
                      isOpen && "rotate-45"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid overflow-hidden transition-all duration-300",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="min-h-0">
                    <p className="px-6 pb-5 text-sm leading-relaxed text-muted">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-muted">
          Still unsure?{" "}
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            Chat with us on WhatsApp
          </a>{" "}
          — we reply within minutes.
        </p>
      </Container>
    </section>
  );
}
