import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/motion/reveal";
import { HOME_CONTENT_FALLBACK, HOME_FALLBACK, type HomeContent, type ServiceCard } from "@/lib/home";

export function Services({
  content = HOME_CONTENT_FALLBACK,
  cards = HOME_FALLBACK.service_cards,
}: {
  content?: HomeContent;
  cards?: ServiceCard[];
}) {
  const [featured, ...rest] = cards;

  return (
    <section id="services" className="py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow={content.services_eyebrow}
          title={content.services_title}
          description={content.services_description}
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured && (
            <Reveal className="h-full md:col-span-2">
              <Link
                href={featured.href}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-8 shadow-lift transition-transform hover:-translate-y-1"
              >
                <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_85%_15%,white,transparent_45%)]" />
                <span className="relative grid size-12 place-items-center rounded-xl bg-white/15 text-white backdrop-blur">
                  <Icon name={featured.icon} className="size-6" />
                </span>
                <h3 className="relative mt-6 max-w-md font-display text-2xl font-semibold text-white">
                  {featured.title}
                </h3>
                <p className="relative mt-3 max-w-lg flex-1 text-sm leading-relaxed text-white/90">
                  {featured.body}
                </p>
                <span className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                  Learn more
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          )}

          {rest.map((card, i) => (
            <Reveal key={card.href} delay={(i + 1) * 0.06} className="h-full">
              <Link
                href={card.href}
                className="group flex h-full flex-col rounded-2xl border border-ink-900/8 bg-white p-7 shadow-soft transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift"
              >
                <span className="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <Icon name={card.icon} className="size-6" />
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold text-ink-900">{card.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{card.body}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                  Learn more
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          ))}

          <Reveal delay={(rest.length + 1) * 0.06} className="h-full">
            <Link
              href="/what-we-do"
              className="group flex h-full min-h-44 flex-col items-start justify-between rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-7 transition-colors hover:border-brand-400 hover:bg-brand-50"
            >
              <h3 className="font-display text-xl font-semibold text-brand-700">
                30+ vaccines &amp; health services
              </h3>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                Explore everything we do
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
