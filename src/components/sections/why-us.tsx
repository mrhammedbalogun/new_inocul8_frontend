import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Icon } from "@/components/ui/icon";
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
      <Container className="grid gap-12 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-4">
          <SectionHeading
            align="left"
            eyebrow={content.whyus_eyebrow}
            title={content.whyus_title}
            description={content.whyus_description}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:col-span-8">
          {items.map((item) => (
            <div
              key={item.title}
              className="flex gap-4 rounded-2xl border border-ink-900/8 bg-white p-6 shadow-soft"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name={item.icon} className="size-6" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink-900">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
