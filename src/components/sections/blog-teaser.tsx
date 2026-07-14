import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";
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

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {teasers.map((post, i) => {
            // Featured spread needs two side cards to fill column 2.
            const featured = i === 0 && teasers.length >= 3;
            return (
              <Reveal key={post.href} delay={i * 0.08} className={featured ? "h-full md:row-span-2" : "h-full"}>
                <Link
                  href={post.href}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-900/8 bg-white shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift"
                >
                  <div
                    className={cn(
                      "relative bg-gradient-to-br from-brand-500 to-brand-800",
                      featured ? "aspect-[16/9]" : "aspect-[16/6]"
                    )}
                  >
                    <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_75%_20%,white,transparent_50%)]" />
                    <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700 backdrop-blur">
                      {post.category}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3
                      className={cn(
                        "font-display font-semibold leading-snug text-ink-900 group-hover:text-brand-700",
                        featured ? "text-2xl" : "text-lg"
                      )}
                    >
                      {post.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{post.excerpt}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                      Read article
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
