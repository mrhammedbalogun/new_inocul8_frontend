import { Container } from "@/components/ui/container";
import { stats } from "@/lib/content";

export function StatsBar() {
  return (
    <section className="border-y border-ink-900/5 bg-white">
      <Container>
        <dl className="grid grid-cols-2 divide-x divide-ink-900/5 py-8 lg:grid-cols-4">
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
