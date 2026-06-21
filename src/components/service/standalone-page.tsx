import { CalendarCheck, Phone } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Breadcrumbs, type Crumb } from "@/components/service/breadcrumbs";
import { ServiceProse } from "@/components/service/service-prose";
import { CtaBanner } from "@/components/sections/cta-banner";
import { MobileBookBar } from "@/components/mobile-book-bar";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema, medicalServiceSchema } from "@/lib/schema";
import { site, phoneHref } from "@/lib/site";
import type { TopLevelPage } from "@/lib/pages";

/**
 * Shared layout for standalone service content pages (Hepatitis B, Yellow Fever,
 * Genital Warts, …) that live at a top-level URL but render like a service detail:
 * hero + migrated prose + sticky booking aside + JSON-LD.
 */
export function StandalonePage({ page, crumbs }: { page: TopLevelPage; crumbs: Crumb[] }) {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema(crumbs),
          medicalServiceSchema({ name: page.title, description: page.metaDescription || page.excerpt, path: page.path }),
        ]}
      />

      <section className="bg-mesh border-b border-ink-900/5 py-12 sm:py-14">
        <Container>
          <Breadcrumbs crumbs={crumbs} />
          <h1 className="mt-6 max-w-3xl font-display text-3xl font-semibold leading-tight text-ink-900 sm:text-4xl">
            {page.title}
          </h1>
          {page.excerpt && (
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{page.excerpt}</p>
          )}
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <article className="min-w-0">
              <ServiceProse html={page.html} />
            </article>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-2xl border border-ink-900/8 bg-white p-6 shadow-soft">
                <h2 className="font-display text-lg font-semibold text-ink-900">Book this service</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Reserve a slot at home, at the office, or at an access point near you. Most
                  appointments are done in under 10 minutes.
                </p>
                <div className="mt-5 grid gap-3">
                  <Button href={site.bookingUrl} variant="accent" size="lg" className="w-full">
                    <CalendarCheck className="size-5" />
                    Book now
                  </Button>
                  <Button href={phoneHref} variant="outline" size="lg" className="w-full">
                    <Phone className="size-4" />
                    {site.phones[0]}
                  </Button>
                </div>
                <p className="mt-4 text-center text-xs text-muted">{site.hours}</p>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      <CtaBanner />
      <div className="h-20 lg:hidden" />
      <MobileBookBar />
    </>
  );
}
