import { Star, Quote } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { site } from "@/lib/site";
import { fillRating, HOME_CONTENT_FALLBACK, HOME_FALLBACK, type HomeContent, type Testimonial } from "@/lib/home";

export function Testimonials({
  content = HOME_CONTENT_FALLBACK,
  testimonials = HOME_FALLBACK.testimonials,
}: {
  content?: HomeContent;
  testimonials?: Testimonial[];
}) {
  return (
    <section className="bg-ink-900 py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow={content.testimonials_eyebrow}
          title={<span className="text-white">{content.testimonials_title}</span>}
          description={fillRating(content.testimonials_description, site.rating.value, site.rating.count)}
          className="[&_p]:text-white/60"
        />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-2xl bg-white/5 p-7 ring-1 ring-white/10 backdrop-blur"
            >
              <Quote className="size-8 text-brand-400" />
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-white/85">
                “{t.quote}”
              </blockquote>
              <div className="mt-5 flex">
                {Array.from({ length: t.rating || 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-gold-400 text-gold-400" />
                ))}
              </div>
              <figcaption className="mt-3">
                <span className="block text-sm font-semibold text-white">{t.name}</span>
                <span className="block text-xs text-white/50">{t.role}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
