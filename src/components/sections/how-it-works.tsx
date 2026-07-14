import { MessageCircle } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { ProgressLine } from "@/components/motion/progress-line";
import { site, whatsappHref } from "@/lib/site";
import { HOME_CONTENT_FALLBACK, HOME_FALLBACK, type HomeContent, type ProcessStep } from "@/lib/home";

export function HowItWorks({
  content = HOME_CONTENT_FALLBACK,
  steps = HOME_FALLBACK.steps,
}: {
  content?: HomeContent;
  steps?: ProcessStep[];
}) {
  return (
    <section className="bg-brand-50/60 py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow={content.steps_eyebrow}
          title={content.steps_title}
          description={content.steps_description}
        />

        <div className="relative mt-16">
          {/* Drawn connector behind the step nodes (desktop) */}
          <ProgressLine className="absolute left-[7%] top-7 hidden h-0.5 w-[86%] rounded-full bg-gradient-to-r from-brand-400 via-brand-500 to-accent-500 md:block" />
          <div className="grid gap-10 md:grid-cols-3">
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.15}>
                <div className="relative md:text-center">
                  <div className="relative z-10 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 font-display text-xl font-semibold text-white shadow-lift md:mx-auto">
                    {i + 1}
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold text-ink-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted md:mx-auto md:max-w-xs">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.2}>
          <div className="mx-auto mt-14 flex max-w-2xl flex-col items-center gap-5 rounded-2xl border border-ink-900/8 bg-white p-6 text-center shadow-soft sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-3">
              <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                <MessageCircle className="size-5" />
                <span aria-hidden className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-brand-500 ring-2 ring-white" />
              </span>
              <p className="text-sm text-ink-700">
                <span className="font-semibold text-ink-900">Questions before you book?</span>
                <br className="sm:hidden" /> We reply on WhatsApp within minutes, {site.hours}.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Button href={site.bookingUrl} variant="accent">
                {content.steps_cta_label}
              </Button>
              <Button href={whatsappHref} variant="ghost">
                WhatsApp us
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
