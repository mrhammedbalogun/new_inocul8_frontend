import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { formatDate, type BlogPost } from "@/lib/blog";

export function PostCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  const category = post.categories[0];
  return (
    <article
      className={`group flex flex-col rounded-2xl border border-ink-900/8 bg-white p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift ${
        featured ? "sm:p-8" : ""
      }`}
    >
      <div className="flex items-center gap-3 text-xs font-medium text-muted">
        {category && (
          <Link
            href={`/blog/category/${category.slug}`}
            className="rounded-full bg-brand-50 px-2.5 py-1 font-semibold text-brand-700 transition-colors hover:bg-brand-100"
          >
            {category.name}
          </Link>
        )}
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" />
          {post.readingMinutes} min read
        </span>
      </div>

      <h3
        className={`mt-4 font-display font-semibold leading-snug text-ink-900 group-hover:text-brand-700 ${
          featured ? "text-2xl" : "text-lg"
        }`}
      >
        <Link href={`/${post.slug}`}>{post.title}</Link>
      </h3>

      <p className={`mt-2 flex-1 leading-relaxed text-muted ${featured ? "text-base" : "text-sm"}`}>
        {post.excerpt}
      </p>

      <div className="mt-5 flex items-center justify-between">
        <time className="text-xs text-muted" dateTime={post.date}>
          {formatDate(post.date)}
        </time>
        <Link
          href={`/${post.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700"
          aria-label={`Read ${post.title}`}
        >
          Read
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </article>
  );
}
