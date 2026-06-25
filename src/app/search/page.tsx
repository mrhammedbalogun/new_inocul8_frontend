import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/service/breadcrumbs";
import { BlogSearch } from "@/components/blog/blog-search";
import { MobileBookBar } from "@/components/mobile-book-bar";

export const metadata: Metadata = {
  title: "Search the Blog",
  description: "Search Inocul8's vaccine and preventive-health articles.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/search" },
};

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blogpost" },
    { name: "Search", path: "/search" },
  ];

  return (
    <>
      <section className="bg-mesh border-b border-ink-900/5 py-12 sm:py-14">
        <Container className="max-w-3xl">
          <Breadcrumbs crumbs={crumbs} />
          <h1 className="mt-6 font-display text-3xl font-semibold leading-tight text-ink-900 sm:text-4xl">
            Search articles
          </h1>
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container className="max-w-3xl">
          <BlogSearch initialQuery={q ?? ""} />
        </Container>
      </section>

      <div className="h-20 lg:hidden" />
      <MobileBookBar />
    </>
  );
}
