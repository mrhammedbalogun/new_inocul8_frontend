import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";
import { HOME_FALLBACK, type Stat } from "@/lib/home";

export function StatsBar({ stats = HOME_FALLBACK.stats }: { stats?: Stat[] }) {
  return (
    <section className="border-y border-ink-900/5 bg-white">
      <Container>
        <dl className="flex flex-wrap items-center justify-center gap-x-4 gap-y-6 py-8 sm:gap-x-0">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={cn(
                "px-6 text-center sm:px-10",
                i > 0 && "sm:border-l sm:border-ink-900/10"
              )}
            >
              <dt className="font-display text-3xl font-semibold text-brand-600 sm:text-4xl">
                {s.value}
              </dt>
              <dd className="mt-1 text-xs text-muted sm:text-sm">{s.label}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
