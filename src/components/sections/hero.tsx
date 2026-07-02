import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icon";
import { site, whatsappHref } from "@/lib/site";
import { fillRating, HOME_CONTENT_FALLBACK, type HomeContent } from "@/lib/home";

const trustPoints = [
  { icon: "map-pin", label: "Convenient" },
  { icon: "wallet", label: "Affordable" },
  { icon: "clock", label: "Timeliness" },
] as const;

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
    <section className="relative overflow-hidden bg-mesh">
      <Container className="grid items-center gap-12 py-16 lg:grid-cols-12 lg:py-24">
        {/* Copy */}
        <div className="lg:col-span-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-brand-700 shadow-soft backdrop-blur">
            <span className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-gold-400 text-gold-400" />
              ))}
            </span>
            {fillRating(content.hero_badge, rating.value, rating.count)}
          </div>

          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] text-ink-900 sm:text-5xl lg:text-6xl">
            {head}
            {tail && <span className="text-gradient">{tail}</span>}
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{content.hero_subtitle}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href={site.bookingUrl} variant="accent" size="lg">
              {content.hero_cta_primary}
            </Button>
            <Button href={whatsappHref} variant="outline" size="lg">
              {content.hero_cta_secondary}
            </Button>
          </div>

          <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-3">
            {trustPoints.map(({ icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-sm font-medium text-ink-700">
                <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-brand-700">
                  <Icon name={icon} className="size-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Visual */}
        <div className="relative lg:col-span-6">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-500 to-brand-700 shadow-lift sm:max-w-lg">
            {/* Decorative — replace with real photography */}
            <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_30%_20%,white,transparent_45%)]" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <div className="rounded-2xl bg-white/95 p-5 shadow-soft backdrop-blur">
                <p className="font-display text-lg font-semibold text-ink-900">
                  Care that comes to you
                </p>
                <p className="mt-1 text-sm text-muted">
                  Home, office, or an access point near you — you choose where.
                </p>
              </div>
            </div>
          </div>

          {/* Floating stat card */}
          <div className="absolute -left-2 top-8 hidden rounded-2xl bg-white p-4 shadow-lift sm:block lg:-left-6">
            <p className="font-display text-2xl font-semibold text-brand-600">30+</p>
            <p className="text-xs text-muted">vaccines &amp; services</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
