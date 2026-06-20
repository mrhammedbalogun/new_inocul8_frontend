import { cn } from "@/lib/utils";

/** Inocul8 wordmark + mark. `variant` flips text colour for dark surfaces. */
export function Logo({
  className,
  variant = "default",
  showTagline = false,
}: {
  className?: string;
  variant?: "default" | "light";
  showTagline?: boolean;
}) {
  const textColor = variant === "light" ? "text-white" : "text-ink-900";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span aria-hidden className="grid place-items-center">
        <svg width="34" height="34" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="36" height="36" rx="11" fill="url(#i8grad)" />
          <path
            d="M20 9c-3.6 4-7 7.3-7 12a7 7 0 1 0 14 0c0-4.7-3.4-8-7-12Z"
            fill="white"
            fillOpacity="0.95"
          />
          <circle cx="20" cy="22.5" r="3" fill="#0c887e" />
          <defs>
            <linearGradient id="i8grad" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#34beb3" />
              <stop offset="1" stopColor="#0c887e" />
            </linearGradient>
          </defs>
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-xl font-semibold tracking-tight", textColor)}>
          Inocul<span className="text-brand-500">8</span>
        </span>
        {showTagline && (
          <span className={cn("mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em]", variant === "light" ? "text-white/60" : "text-muted")}>
            Convenient · Timely · Safe
          </span>
        )}
      </span>
    </span>
  );
}
