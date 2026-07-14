import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { HeroVisual } from "@/components/sections/hero-visual";
import { site, whatsappHref } from "@/lib/site";
import { heroTrustLine } from "@/lib/content-extra";
import { fillRating, HOME_CONTENT_FALLBACK, type HomeContent } from "@/lib/home";

export function Hero({
  content = HOME_CONTENT_FALLBACK,
  rating = site.rating,
}: {
  content?: HomeContent;
  rating?: { value: number; count: number };
}) {
  // Split the title so the highlight tail renders in the brand gradient.
  const highlight = content.hero_title_highlight;
  const idx = highlight ? content.hero_title.lastIndexOf(highlight) : -1;
  const head = idx >= 0 ? content.hero_title.slice(0, idx) : content.hero_title;
  const tail = idx >= 0 ? content.hero_title.slice(idx) : "";

  return (
    <section className="relative overflow-hidden bg-mesh-warm">
      <Container className="grid items-center gap-14 py-16 lg:min-h-[85svh] lg:grid-cols-12 lg:py-20">
        {/* Copy */}
        <div className="animate-fade-up lg:col-span-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-brand-700 shadow-soft backdrop-blur">
            <span className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-gold-400 text-gold-400" />
              ))}
            </span>
            {fillRating(content.hero_badge, rating.value, rating.count)}
          </div>

          <h1 className="mt-6 font-display text-[2.6rem] font-semibold leading-[1.06] tracking-tight text-ink-900 sm:text-5xl lg:text-6xl xl:text-[4.25rem]">
            {head}
            {tail && <span className="text-gradient">{tail}</span>}
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{content.hero_subtitle}</p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button href={site.bookingUrl} variant="accent" size="lg">
              {content.hero_cta_primary}
            </Button>
            <Button href={whatsappHref} variant="outline" size="lg">
              {content.hero_cta_secondary}
            </Button>
          </div>

          <ul className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-ink-700">
            {heroTrustLine.map((label, i) => (
              <li key={label} className="flex items-center gap-3">
                {i > 0 && <span aria-hidden className="size-1 rounded-full bg-brand-300" />}
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Visual */}
        <div className="lg:col-span-6">
          <HeroVisual rating={rating} />
        </div>
      </Container>
    </section>
  );
}
