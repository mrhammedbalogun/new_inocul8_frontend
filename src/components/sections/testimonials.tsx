import { Star, Quote, ExternalLink, BadgeCheck } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { site } from "@/lib/site";
import { fillRating, HOME_CONTENT_FALLBACK, HOME_FALLBACK, type HomeContent, type Testimonial } from "@/lib/home";

function TestimonialCard({ t, hidden = false }: { t: Testimonial; hidden?: boolean }) {
  const card = (
    <figure className="flex h-full flex-col rounded-2xl bg-white/5 p-7 ring-1 ring-white/10 backdrop-blur transition-shadow group-hover/card:ring-white/25">
      <Quote className="size-8 text-brand-400" />
      <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-white/85">
        “{t.quote}”
      </blockquote>
      <div className="mt-5 flex">
        {Array.from({ length: t.rating || 5 }).map((_, i) => (
          <Star key={i} className="size-4 fill-gold-400 text-gold-400" />
        ))}
      </div>
      <figcaption className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <span className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-semibold text-white"
          >
            {t.name.trim().charAt(0).toUpperCase()}
          </span>
          <span>
            <span className="block text-sm font-semibold text-white">{t.name}</span>
            <span className="block text-xs text-white/50">{t.role}</span>
          </span>
        </span>
        {(t.source === "google" || t.reviewUrl) && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-brand-300">
            <BadgeCheck className="size-3.5" /> Verified
            {t.reviewUrl && <ExternalLink className="size-3" />}
          </span>
        )}
      </figcaption>
    </figure>
  );

  if (t.reviewUrl) {
    return (
      <a
        href={t.reviewUrl}
        target="_blank"
        rel="noopener nofollow"
        aria-hidden={hidden || undefined}
        tabIndex={hidden ? -1 : undefined}
        className="group/card block h-full"
      >
        {card}
      </a>
    );
  }
  return card;
}

export function Testimonials({
  content = HOME_CONTENT_FALLBACK,
  testimonials = HOME_FALLBACK.testimonials,
  rating = site.rating,
}: {
  content?: HomeContent;
  testimonials?: Testimonial[];
  rating?: { value: number; count: number };
}) {
  // With a handful of reviews a static grid looks intentional; once the Google
  // sync grows the collection, switch to an endless marquee.
  const marquee = testimonials.length > 3;

  return (
    <section className="bg-ink-900 py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow={content.testimonials_eyebrow}
          title={<span className="text-white">{content.testimonials_title}</span>}
          description={fillRating(content.testimonials_description, rating.value, rating.count)}
          className="[&_p]:text-white/60 [&>span]:text-brand-300"
        />

        {marquee ? (
          <div
            className="marquee mt-14"
            style={{ "--marquee-duration": `${testimonials.length * 7}s` } as React.CSSProperties}
          >
            {/* Margins (not flex gap) keep the copies exactly half the track,
                so the -50% loop is seamless. */}
            <div className="marquee-track flex w-max">
              {testimonials.map((t, i) => (
                <div key={`a-${i}`} className="mr-6 w-[85vw] max-w-[360px] shrink-0">
                  <TestimonialCard t={t} />
                </div>
              ))}
              {/* Seamless-loop clone — invisible to screen readers and keyboards. */}
              {testimonials.map((t, i) => (
                <div key={`b-${i}`} className="mr-6 w-[85vw] max-w-[360px] shrink-0" aria-hidden>
                  <TestimonialCard t={t} hidden />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <TestimonialCard key={i} t={t} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}
