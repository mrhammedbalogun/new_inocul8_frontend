import { Star, Quote } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { testimonials } from "@/lib/content";
import { site } from "@/lib/site";

export function Testimonials() {
  return (
    <section className="bg-ink-900 py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="Loved by patients"
          title={<span className="text-white">Trusted across Lagos and beyond</span>}
          description={`Rated ${site.rating.value} from ${site.rating.count}+ reviews — here's what people say about care with Inocul8.`}
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
                {Array.from({ length: 5 }).map((_, i) => (
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
