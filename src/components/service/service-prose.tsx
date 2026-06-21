import { cn } from "@/lib/utils";

/**
 * Renders migrated service-page HTML (cleaned from the legacy WP DB).
 * The markup is a fixed whitelist — h2/h3/p/ul/li/strong/em/a — produced by the
 * toolkit's clean-content.mjs, so it is safe to render. Styling lives in the
 * `.service-prose` component class in globals.css.
 */
export function ServiceProse({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn("service-prose", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
