import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
import { getPage } from "@/lib/pages";
import { breadcrumbSchema, medicalServiceSchema } from "@/lib/schema";
import { site } from "@/lib/site";

// Standalone top-level pages (preserved WP URLs, outside /what-we-do/) that
// belong on a category's card grid for parity with the legacy site, which
// listed them inline even though they don't live under the category path.
const EXTRA_CATEGORY_PAGES: Record<string, string[]> = {
  "travel-health-services": ["yellow-fever", "yellow-fever-travel-international-premium"],
  "sexual-reproductive-health-services": ["hepatitis-b"],
  "myhealth-services": ["genital-warts"],
};

export function generateStaticParams() {
  return getCategoryParams();
}

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategory(category);
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
  const cat = await getCategory(category);
  if (!cat) notFound();

  const extraSlugs = EXTRA_CATEGORY_PAGES[category] ?? [];
  const extraPages = extraSlugs.length ? await Promise.all(extraSlugs.map((slug) => getPage(slug))) : [];
  const cards = [
    ...cat.services.map((s) => ({ key: s.slug, path: s.path, title: s.title, excerpt: s.excerpt, image: s.image })),
    ...extraPages
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({ key: p.slug, path: p.path, title: p.title, excerpt: p.excerpt, image: p.image })),
  ].sort((a, b) => a.title.localeCompare(b.title, "en"));

  const crumbs = [
    { name: "Home", path: "/" },
    { name: "What We Do", path: "/what-we-do" },
    { name: cat.label, path: cat.path },
  ];
  const hasChildren = cards.length > 0;

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
              {cards.map((s) => (
                <Link
                  key={s.key}
                  href={s.path}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-ink-900/8 bg-white shadow-soft transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift"
                >
                  {s.image && (
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-brand-50">
                      <Image
                        src={s.image}
                        alt={s.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-6">
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
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      ) : (
        <section className="py-12 sm:py-16">
          <Container className="max-w-3xl">
            {/* Migrated WP content begins at h3 — keep the heading outline sequential. */}
            <h2 className="sr-only">About this service</h2>
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
