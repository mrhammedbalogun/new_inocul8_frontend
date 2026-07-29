import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/service/breadcrumbs";
import { PostCard } from "@/components/blog/post-card";
import { CtaBanner } from "@/components/sections/cta-banner";
import { MobileBookBar } from "@/components/mobile-book-bar";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/schema";
import { getAllPosts, getCategories } from "@/lib/blog";
import { site } from "@/lib/site";

const description =
  "Talk Vaccines with Inocul8 — practical, trustworthy guides on childhood immunization, travel health, yellow fever cards, HPV, hepatitis B and preventive care in Nigeria.";

export const metadata: Metadata = {
  title: "Blog — Talk Vaccines with Inocul8",
  description,
  alternates: { canonical: "/blogpost" },
  openGraph: { title: "Inocul8 Blog", description, url: "/blogpost", type: "website" },
};

export default async function BlogIndexPage() {
  const [posts, categories] = await Promise.all([getAllPosts(), getCategories()]);
  const [featured, ...rest] = posts;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blogpost" },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema(crumbs),
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "Talk Vaccines with Inocul8",
            url: `${site.url}/blogpost`,
            publisher: { "@id": `${site.url}/#organization` },
          },
        ]}
      />

      <section className="bg-mesh border-b border-ink-900/5 py-12 sm:py-16">
        <Container>
          <Breadcrumbs crumbs={crumbs} />
          <div className="mt-6 max-w-3xl">
            <span className="inline-block text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Talk Vaccines
            </span>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
              Vaccine guides, simply explained
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted">{description}</p>

            <form action="/search" method="get" role="search" className="relative mt-6 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
              <input
                type="search"
                name="q"
                placeholder="Search articles — yellow fever card, HPV, hepatitis B…"
                aria-label="Search blog articles"
                className="w-full rounded-full border border-ink-900/12 bg-white py-3.5 pl-12 pr-4 text-base text-ink-900 shadow-soft outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </form>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white">
              All posts
            </span>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/blog/category/${c.slug}`}
                className="rounded-full border border-ink-900/10 bg-white px-3.5 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              >
                {c.name} <span className="text-muted">({c.count})</span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container>
          {featured && (
            <div className="mb-8">
              <PostCard post={featured} featured />
            </div>
          )}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <PostCard key={post.slug} post={post} />
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
