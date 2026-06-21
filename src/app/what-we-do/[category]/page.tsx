import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/service/breadcrumbs";
import { ServiceProse } from "@/components/service/service-prose";
import { CtaBanner } from "@/components/sections/cta-banner";
import { MobileBookBar } from "@/components/mobile-book-bar";
import { JsonLd } from "@/components/seo/json-ld";
import { getCategories, getCategory, getCategoryParams } from "@/lib/services";
import { breadcrumbSchema, medicalServiceSchema } from "@/lib/schema";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return getCategoryParams();
}

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) return {};
  const canonical = cat.path;
  const description = cat.page.metaDescription || cat.blurb;
  return {
    title: cat.page.seoTitle || cat.label,
    description,
    alternates: { canonical },
    openGraph: { title: `${cat.label} | Inocul8`, description, url: canonical, type: "website" },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) notFound();

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "What We Do", path: "/what-we-do" },
    { name: cat.label, path: cat.path },
  ];
  const hasChildren = cat.services.length > 0;

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema(crumbs),
          medicalServiceSchema({ name: cat.label, description: cat.page.metaDescription || cat.blurb, path: cat.path }),
        ]}
      />

      <section className="bg-mesh border-b border-ink-900/5 py-12 sm:py-16">
        <Container>
          <Breadcrumbs crumbs={crumbs} />
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name={cat.icon} className="size-6" />
              </span>
              <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
                {cat.page.title}
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-muted">{cat.blurb}</p>
            </div>
            <div className="shrink-0">
              <Button href={site.bookingUrl} variant="accent" size="lg">
                Book an appointment
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {hasChildren ? (
        <section className="py-16 sm:py-20">
          <Container>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {cat.services.map((s) => (
                <Link
                  key={s.slug}
                  href={s.path}
                  className="group flex flex-col rounded-2xl border border-ink-900/8 bg-white p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift"
                >
                  <h2 className="font-display text-lg font-semibold text-ink-900 group-hover:text-brand-700">
                    {s.title}
                  </h2>
                  {s.excerpt && (
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted line-clamp-3">{s.excerpt}</p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                    View details
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      ) : (
        <section className="py-12 sm:py-16">
          <Container className="max-w-3xl">
            <ServiceProse html={cat.page.html} />
            <div className="mt-10 rounded-2xl border border-brand-100 bg-brand-50/60 p-8 text-center">
              <h2 className="font-display text-2xl font-semibold text-ink-900">Ready to get started?</h2>
              <p className="mx-auto mt-2 max-w-xl text-muted">
                Book a {cat.label.toLowerCase()} appointment, or talk to our team for a tailored plan.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button href={site.bookingUrl} variant="accent" size="lg">
                  Book now
                </Button>
                <Button href="/contact" variant="outline" size="lg">
                  Contact us
                </Button>
              </div>
            </div>
          </Container>
        </section>
      )}

      <CtaBanner />
      <div className="h-20 lg:hidden" />
      <MobileBookBar />
    </>
  );
}
