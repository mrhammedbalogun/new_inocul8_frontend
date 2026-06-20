import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Official Inocul8 wordmark (teal lockup with tagline + ®).
 * Works on light and dark surfaces. `priority` for above-the-fold use (header).
 */
export function Logo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/inocul8-logo.png"
      alt="Inocul8 — Convenient, Timely, Safe"
      width={2590}
      height={681}
      priority={priority}
      sizes="(max-width: 640px) 140px, 170px"
      className={cn("h-9 w-auto sm:h-10", className)}
    />
  );
}
