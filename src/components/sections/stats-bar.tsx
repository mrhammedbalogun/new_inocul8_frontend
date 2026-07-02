import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";
import { HOME_FALLBACK, type Stat } from "@/lib/home";

// Grid columns adapt to however many stats the CMS returns.
const GRID_COLS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
};

export function StatsBar({ stats = HOME_FALLBACK.stats }: { stats?: Stat[] }) {
  return (
    <section className="border-y border-ink-900/5 bg-white">
      <Container>
        <dl
          className={cn(
            "grid divide-x divide-ink-900/5 py-8",
            GRID_COLS[stats.length] ?? "grid-cols-2 lg:grid-cols-4"
          )}
        >
          {stats.map((s) => (
            <div key={s.label} className="px-4 text-center">
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
