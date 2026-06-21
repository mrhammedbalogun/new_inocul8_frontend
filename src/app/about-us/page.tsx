import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/service/breadcrumbs";
import { ServiceProse } from "@/components/service/service-prose";
import { StatsBar } from "@/components/sections/stats-bar";
import { WhyUs } from "@/components/sections/why-us";
import { CtaBanner } from "@/components/sections/cta-banner";
import { MobileBookBar } from "@/components/mobile-book-bar";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/schema";
import { getPage, pageMetadata } from "@/lib/pages";

const page = getPage("about-us");

export const metadata = pageMetadata("about-us", "website");

export default function AboutPage() {
  if (!page) notFound();
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "About Us", path: "/about-us" },
  ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(crumbs)} />

      <section className="bg-mesh border-b border-ink-900/5 py-12 sm:py-16">
        <Container>
          <Breadcrumbs crumbs={crumbs} />
          <div className="mt-6 max-w-3xl">
            <span className="inline-block text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              About Us
            </span>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
              Preventive health, made convenient and affordable
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              {page.excerpt ||
                "Inocul8 is a health-technology company bringing safe, effective and affordable vaccination and preventive care to families and organizations across Lagos."}
            </p>
          </div>
        </Container>
      </section>

      <StatsBar />

      <section className="py-16 sm:py-20">
        <Container className="max-w-3xl">
          <ServiceProse html={page.html} />
        </Container>
      </section>

      <WhyUs />
      <CtaBanner />
      <div className="h-20 lg:hidden" />
      <MobileBookBar />
    </>
  );
}
