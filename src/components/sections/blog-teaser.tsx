import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { HOME_CONTENT_FALLBACK, HOME_FALLBACK, type BlogTeaser as BlogTeaserItem, type HomeContent } from "@/lib/home";

export function BlogTeaser({
  content = HOME_CONTENT_FALLBACK,
  teasers = HOME_FALLBACK.blog_teasers,
}: {
  content?: HomeContent;
  teasers?: BlogTeaserItem[];
}) {
  return (
    <section className="bg-brand-50/60 py-20 sm:py-24">
      <Container>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <SectionHeading
            align="left"
            eyebrow={content.blog_eyebrow}
            title={content.blog_title}
            description={content.blog_description}
          />
          <Link
            href="/blogpost"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            View all articles <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {teasers.map((post) => (
            <Link
              key={post.href}
              href={post.href}
              className="group flex flex-col overflow-hidden rounded-2xl border border-ink-900/8 bg-white shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="aspect-[16/10] bg-gradient-to-br from-brand-200 to-brand-400" />
              <div className="flex flex-1 flex-col p-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                  {post.category}
                </span>
                <h3 className="mt-2 font-display text-lg font-semibold leading-snug text-ink-900 group-hover:text-brand-700">
                  {post.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{post.excerpt}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                  Read article
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
