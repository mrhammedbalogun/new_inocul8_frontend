import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/motion/reveal";
import { prevention } from "@/lib/content-extra";

/** Editorial "problem/risk" beat of the storytelling arc — why preventive
 * care matters, before we show what we offer. Static content for now. */
export function Prevention() {
  return (
    <section className="bg-brand-50/60 py-20 sm:py-24">
      <Container className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeading
            align="left"
            eyebrow={prevention.eyebrow}
            title={prevention.title}
            description={prevention.description}
          />
          <Link
            href={prevention.ctaHref}
            className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            {prevention.ctaLabel} <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid content-start gap-5 lg:col-span-7">
          {prevention.points.map((point, i) => (
            <Reveal key={point.title} delay={i * 0.08}>
              <div className="flex gap-5 rounded-2xl border border-ink-900/8 bg-white p-6 shadow-soft">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft">
                  <Icon name={point.icon} className="size-6" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink-900">{point.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{point.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
