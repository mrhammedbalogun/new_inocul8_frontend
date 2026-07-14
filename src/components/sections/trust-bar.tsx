import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icon";
import { CountUp } from "@/components/motion/count-up";
import { trustMarks } from "@/lib/content-extra";
import { cn } from "@/lib/utils";
import { HOME_FALLBACK, type Stat } from "@/lib/home";

/** Stats (animated count-up) + credibility marks. Replaces StatsBar. */
export function TrustBar({ stats = HOME_FALLBACK.stats }: { stats?: Stat[] }) {
  return (
    <section className="border-y border-ink-900/5 bg-white">
      <Container className="py-10">
        <dl className="flex flex-wrap items-center justify-center gap-x-4 gap-y-6 sm:gap-x-0">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={cn("px-6 text-center sm:px-12", i > 0 && "sm:border-l sm:border-ink-900/10")}
            >
              <dt className="font-display text-3xl font-semibold text-brand-600 sm:text-4xl">
                <CountUp value={s.value} />
              </dt>
              <dd className="mt-1 text-xs text-muted sm:text-sm">{s.label}</dd>
            </div>
          ))}
        </dl>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-ink-900/5 pt-7">
          {trustMarks.map((mark) => (
            <li key={mark.label} className="flex items-center gap-2 text-xs font-medium text-ink-700 sm:text-sm">
              <span className="grid size-6 place-items-center rounded-full bg-brand-50 text-brand-600">
                <Icon name={mark.icon} className="size-3.5" />
              </span>
              {mark.label}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
