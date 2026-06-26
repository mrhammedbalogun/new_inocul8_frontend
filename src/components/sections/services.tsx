import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Icon } from "@/components/ui/icon";
import { HOME_CONTENT_FALLBACK, HOME_FALLBACK, type HomeContent, type ServiceCard } from "@/lib/home";

export function Services({
  content = HOME_CONTENT_FALLBACK,
  cards = HOME_FALLBACK.service_cards,
}: {
  content?: HomeContent;
  cards?: ServiceCard[];
}) {
  return (
    <section id="services" className="py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow={content.services_eyebrow}
          title={content.services_title}
          description={content.services_description}
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group relative flex flex-col rounded-2xl border border-ink-900/8 bg-white p-7 shadow-soft transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift"
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
          ))}
        </div>
      </Container>
    </section>
  );
}
