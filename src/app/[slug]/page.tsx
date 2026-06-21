import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, Calendar } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/service/breadcrumbs";
import { ServiceProse } from "@/components/service/service-prose";
import { PostCard } from "@/components/blog/post-card";
import { ShareButtons } from "@/components/blog/share-buttons";
import { CtaBanner } from "@/components/sections/cta-banner";
import { MobileBookBar } from "@/components/mobile-book-bar";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema, articleSchema } from "@/lib/schema";
import { getPost, getAllPostSlugs, getRelatedPosts, formatDate } from "@/lib/blog";
import { site } from "@/lib/site";

// Posts keep their original root slugs; only the 70 known slugs resolve here.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const description = post.metaDescription || post.excerpt;
  return {
    title: post.seoTitle || post.title,
    description,
    keywords: post.focusKeyword ? [post.focusKeyword] : undefined,
    alternates: { canonical: `/${post.slug}` },
    openGraph: {
      title: post.title,
      description,
      url: `/${post.slug}`,
      type: "article",
      publishedTime: new Date(post.date.replace(" ", "T")).toISOString(),
      modifiedTime: new Date((post.modified || post.date).replace(" ", "T")).toISOString(),
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = getRelatedPosts(post, 3);
  const category = post.categories[0];
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blogpost" },
    { name: post.title, path: `/${post.slug}` },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema(crumbs),
          articleSchema({
            title: post.title,
            description: post.metaDescription || post.excerpt,
            path: `/${post.slug}`,
            datePublished: post.date,
            dateModified: post.modified,
          }),
        ]}
      />

      <section className="bg-mesh border-b border-ink-900/5 py-12 sm:py-14">
        <Container className="max-w-3xl">
          <Breadcrumbs crumbs={crumbs} />
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            {category && (
              <Link
                href={`/blog/category/${category.slug}`}
                className="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700 transition-colors hover:bg-brand-100"
              >
                {category.name}
              </Link>
            )}
            <span className="inline-flex items-center gap-1.5 text-muted">
              <Calendar className="size-4" />
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted">
              <Clock className="size-4" />
              {post.readingMinutes} min read
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight text-ink-900 sm:text-4xl">
            {post.title}
          </h1>
        </Container>
      </section>

      <section className="py-12 sm:py-16">
        <Container className="max-w-3xl">
          <ServiceProse html={post.html} />

          <div className="mt-10 border-t border-ink-900/8 pt-6">
            <ShareButtons slug={post.slug} title={post.title} />
          </div>

          <div className="mt-8 flex items-center gap-4 rounded-2xl border border-ink-900/8 bg-white p-6 shadow-soft">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-600 font-display text-lg font-semibold text-white">
              I8
            </span>
            <div>
              <p className="font-semibold text-ink-900">The Inocul8 Team</p>
              <p className="mt-0.5 text-sm text-muted">
                Preventive-health writers and clinicians sharing trustworthy vaccine guidance for Nigeria.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {related.length > 0 && (
        <section className="border-t border-ink-900/5 bg-brand-50/30 py-14 sm:py-16">
          <Container>
            <h2 className="font-display text-2xl font-semibold text-ink-900">Related reading</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {related.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
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
