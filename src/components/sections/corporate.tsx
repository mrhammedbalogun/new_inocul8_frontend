import { Check } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { corporate } from "@/lib/content-extra";
import { whatsappHref } from "@/lib/site";

/** Corporate/HR segment band — the one high-contrast moment on the page.
 * Static content for now (CMS wiring is a follow-up). Inset rounded panel
 * (not full-bleed) so it stays visually distinct from the full-bleed dark
 * Testimonials section that follows. */
export function Corporate() {
  return (
    <section className="py-10 sm:py-14">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-ink-950 px-8 py-14 sm:px-14 lg:px-20">
            <div
              aria-hidden
              className="absolute inset-0 opacity-60 [background-image:radial-gradient(50%_60%_at_85%_10%,rgba(20,168,156,0.25),transparent_60%),radial-gradient(40%_50%_at_10%_90%,rgba(20,168,156,0.15),transparent_55%)]"
            />
            <div className="relative grid gap-10 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-6">
                <span className="inline-block text-sm font-semibold uppercase tracking-[0.2em] text-brand-300">
                  {corporate.eyebrow}
                </span>
                <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
                  {corporate.title}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/70">{corporate.description}</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button href={corporate.ctaHref} variant="accent" size="lg">
                    {corporate.ctaLabel}
                  </Button>
                  <Button
                    href={whatsappHref}
                    size="lg"
                    className="border-2 border-white/25 bg-transparent text-white hover:bg-white/10"
                  >
                    Chat with our team
                  </Button>
                </div>
              </div>
              <ul className="grid gap-4 lg:col-span-6">
                {corporate.points.map((point) => (
                  <li key={point.title} className="flex gap-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-500/20 text-brand-300">
                      <Check className="size-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{point.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-white/60">{point.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
