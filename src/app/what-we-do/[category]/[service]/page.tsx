import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarCheck, Phone } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/service/breadcrumbs";
import { ServiceProse } from "@/components/service/service-prose";
import { CtaBanner } from "@/components/sections/cta-banner";
import { MobileBookBar } from "@/components/mobile-book-bar";
import { JsonLd } from "@/components/seo/json-ld";
import { getCategory, getService, getServiceParams } from "@/lib/services";
import { breadcrumbSchema, medicalServiceSchema } from "@/lib/schema";
import { site, phoneHref } from "@/lib/site";

export function generateStaticParams() {
  return getServiceParams();
}

type Props = { params: Promise<{ category: string; service: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, service } = await params;
  const page = await getService(category, service);
  if (!page) return {};
  const description = page.metaDescription || page.excerpt;
  return {
    title: page.seoTitle || page.title,
    description,
    keywords: page.focusKeyword ? [page.focusKeyword] : undefined,
    alternates: { canonical: page.path },
    openGraph: {
      title: `${page.title} | Inocul8`,
      description,
      url: page.path,
      type: "article",
      images: page.image ? [page.image] : undefined,
    },
  };
}

export default async function ServicePage({ params }: Props) {
  const { category, service } = await params;
  const [cat, page] = await Promise.all([getCategory(category), getService(category, service)]);
  if (!cat || !page) notFound();

  const related = cat.services.filter((s) => s.slug !== page.slug).slice(0, 4);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "What We Do", path: "/what-we-do" },
    { name: cat.label, path: cat.path },
    { name: page.title, path: page.path },
  ];

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
              {page.image && (
                <div className="relative mb-8 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-brand-50">
                  <Image
                    src={page.image}
                    alt={page.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 800px"
                    className="object-cover"
                  />
                </div>
              )}
              {/* Migrated WP content begins at h3 — keep the heading outline sequential. */}
              <h2 className="sr-only">Service details</h2>
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

              {related.length > 0 && (
                <div className="mt-6 rounded-2xl border border-ink-900/8 bg-white p-6 shadow-soft">
                  <h2 className="font-display text-base font-semibold text-ink-900">
                    More in {cat.label}
                  </h2>
                  <ul className="mt-4 grid gap-1">
                    {related.map((s) => (
                      <li key={s.slug}>
                        <Link
                          href={s.path}
                          className="group flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm text-ink-800 transition-colors hover:bg-brand-50 hover:text-brand-700"
                        >
                          <span className="line-clamp-1">{s.title}</span>
                          <ArrowRight className="size-4 shrink-0 text-ink-900/30 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={cat.path}
                    className="mt-3 inline-flex items-center gap-1.5 px-2 text-sm font-semibold text-brand-700"
                  >
                    View all
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              )}
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
