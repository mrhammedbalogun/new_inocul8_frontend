import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Icon } from "@/components/ui/icon";
import { Breadcrumbs } from "@/components/service/breadcrumbs";
import { CtaBanner } from "@/components/sections/cta-banner";
import { MobileBookBar } from "@/components/mobile-book-bar";
import { JsonLd } from "@/components/seo/json-ld";
import { getCategories, hubPage } from "@/lib/services";
import { breadcrumbSchema } from "@/lib/schema";

const description =
  hubPage?.metaDescription ||
  "Explore Inocul8's full range of preventive health and vaccination services — childhood immunization, travel health, sexual & reproductive health, and corporate wellness in Lagos.";

export const metadata: Metadata = {
  title: "What We Do — Vaccination & Preventive Health Services",
  description,
  alternates: { canonical: "/what-we-do" },
  openGraph: {
    title: "What We Do | Inocul8",
    description,
    url: "/what-we-do",
    type: "website",
  },
};

export default function WhatWeDoPage() {
  const categories = getCategories();
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "What We Do", path: "/what-we-do" },
  ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(crumbs)} />

      <section className="bg-mesh border-b border-ink-900/5 py-12 sm:py-16">
        <Container>
          <Breadcrumbs crumbs={crumbs} />
          <div className="mt-6 max-w-3xl">
            <span className="inline-block text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              What We Do
            </span>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
              Preventive healthcare, end to end
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              From a baby&apos;s first shots to a healthier workforce, Inocul8 delivers convenient,
              affordable vaccination and preventive care at your doorstep across Lagos.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={cat.path}
                className="group relative flex flex-col rounded-2xl border border-ink-900/8 bg-white p-7 shadow-soft transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift"
              >
                <span className="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <Icon name={cat.icon} className="size-6" />
                </span>
                <h2 className="mt-5 font-display text-xl font-semibold text-ink-900">{cat.label}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{cat.blurb}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                  {cat.services.length > 0 ? `View ${cat.services.length} services` : "Learn more"}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <CtaBanner />
      <div className="h-20 lg:hidden" />
      <MobileBookBar />
    </>
  );
}
