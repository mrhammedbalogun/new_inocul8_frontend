import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/service/breadcrumbs";
import { PostCard } from "@/components/blog/post-card";
import { CtaBanner } from "@/components/sections/cta-banner";
import { MobileBookBar } from "@/components/mobile-book-bar";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/schema";
import { getCategories, getCategory, getPostsByCategory } from "@/lib/blog";

export const dynamicParams = false;

export function generateStaticParams() {
  return getCategories().map((c) => ({ slug: c.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategory(slug);
  if (!cat) return {};
  const description = `${cat.name} — vaccine and preventive-health articles from Inocul8, Lagos.`;
  const path = `/blog/category/${cat.slug}`;
  return {
    title: `${cat.name} — Inocul8 Blog`,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${cat.name} | Inocul8 Blog`, description, url: path, type: "website" },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const cat = getCategory(slug);
  if (!cat) notFound();

  const posts = getPostsByCategory(slug);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blogpost" },
    { name: cat.name, path: `/blog/category/${cat.slug}` },
  ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(crumbs)} />

      <section className="bg-mesh border-b border-ink-900/5 py-12 sm:py-16">
        <Container>
          <Breadcrumbs crumbs={crumbs} />
          <div className="mt-6 max-w-3xl">
            <span className="inline-block text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Category
            </span>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
              {cat.name}
            </h1>
            <p className="mt-4 text-muted">
              {posts.length} article{posts.length === 1 ? "" : "s"} ·{" "}
              <Link href="/blogpost" className="font-semibold text-brand-700 hover:underline">
                View all posts
              </Link>
            </p>
          </div>
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
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
