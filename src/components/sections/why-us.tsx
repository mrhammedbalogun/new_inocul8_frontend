import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/motion/reveal";
import { HOME_CONTENT_FALLBACK, HOME_FALLBACK, type HomeContent, type ValueProp } from "@/lib/home";

export function WhyUs({
  content = HOME_CONTENT_FALLBACK,
  items = HOME_FALLBACK.value_props,
}: {
  content?: HomeContent;
  items?: ValueProp[];
}) {
  return (
    <section className="py-20 sm:py-24">
      <Container className="grid gap-12 lg:grid-cols-12 lg:items-start">
        <div className="lg:sticky lg:top-28 lg:col-span-4">
          <SectionHeading
            align="left"
            eyebrow={content.whyus_eyebrow}
            title={content.whyus_title}
            description={content.whyus_description}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:col-span-8">
          {items.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08} className="h-full">
              <div className="group h-full rounded-2xl border border-ink-900/8 bg-white p-7 shadow-soft transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift">
                <span className="grid size-13 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 ring-1 ring-brand-200/60 transition-colors group-hover:from-brand-500 group-hover:to-brand-700 group-hover:text-white">
                  <Icon name={item.icon} className="size-6" />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-ink-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
