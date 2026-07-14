# Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Inocul8 homepage in the approved "editorial + product hybrid" direction — new hero with floating-card composition, animated trust bar, new prevention + corporate sections, bento services, timeline booking steps, upgraded footer with a real newsletter — while keeping every CMS-driven field wired exactly as today.

**Architecture:** All sections stay Server Components; motion lives in small client leaves (`Reveal`, `CountUp`, `HeroVisual`, `Faq`, `NewsletterForm`) using the `motion` package via `LazyMotion`/`m` (small bundle). New sections use static content in `src/lib/content-extra.ts` following the existing fallback pattern. No backend changes.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 (`@theme` tokens), `motion` (framer-motion successor), lucide-react, CVA.

**Verification instead of unit tests:** This repo has no test runner and the work is visual. Every task verifies with `npm run build` (type + lint gate) and/or the dev server in the browser. Final task is a full QA pass.

**Spec:** `docs/superpowers/specs/2026-07-13-homepage-redesign-design.md`

**Deviations from spec (deliberate):**
- Blog reading time omitted: teasers only carry title/excerpt (CMS + static), so any minute count would be invented. Add when the CMS exposes it.
- Newsletter posts to `/api/contact` with `phone: "n/a"` because the Django `ContactMessage.phone` field is required (`models.py:346`).

---

### Task 1: Motion foundation + design tokens

**Files:**
- Modify: `package.json` (via npm)
- Modify: `src/app/globals.css`
- Create: `src/components/motion/reveal.tsx`
- Create: `src/components/motion/count-up.tsx`

- [ ] **Step 1: Install motion**

Run: `npm install motion`
Expected: added to dependencies, no peer warnings (React 19 supported).

- [ ] **Step 2: Extend design tokens in `globals.css`**

Inside the existing `@theme` block add:

```css
  --shadow-float: 0 24px 60px -20px rgba(16, 63, 60, 0.28), 0 8px 20px -8px rgba(16, 63, 60, 0.1);
  --animate-float: float-y 5s ease-in-out infinite alternate;
```

After the existing `fade-up` keyframes add:

```css
@keyframes float-y {
  from { transform: translateY(-6px); }
  to { transform: translateY(6px); }
}
```

Inside `@layer components` (after `.bg-mesh`) add:

```css
  /* Warmer hero mesh: teal + a whisper of coral so the page opens warm. */
  .bg-mesh-warm {
    background-image:
      radial-gradient(55% 55% at 12% 0%, rgba(52, 190, 179, 0.16) 0%, transparent 60%),
      radial-gradient(45% 45% at 95% 12%, rgba(255, 122, 89, 0.09) 0%, transparent 55%),
      radial-gradient(50% 60% at 70% 90%, rgba(102, 212, 202, 0.12) 0%, transparent 60%);
  }
```

(Existing `prefers-reduced-motion` override already disables the float animation.)

- [ ] **Step 3: Create `src/components/motion/reveal.tsx`**

```tsx
"use client";

// Scroll-reveal wrapper: fades/slides children in the first time they enter
// the viewport. Server components stay server-rendered — only this thin
// wrapper is a client island. Respects prefers-reduced-motion.
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";

export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        className={className}
        initial={reduce ? false : { opacity: 0, y }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}
```

- [ ] **Step 4: Create `src/components/motion/count-up.tsx`**

```tsx
"use client";

// Animates the numeric part of a stat ("4.9★", "30+") on first view; values
// with no digits ("Near you") render as-is. The real value is server-rendered
// so SEO and no-JS visitors always see the final number.
import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

export function CountUp({ value, duration = 1.3 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const match = value.match(/^([^\d]*)([\d.,]+)(.*)$/);
    if (!match || reduce || !inView) return;
    const target = parseFloat(match[2].replace(/,/g, ""));
    const decimals = (match[2].split(".")[1] ?? "").length;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(`${match[1]}${(target * eased).toFixed(decimals)}${match[3]}`);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, value, duration]);

  return <span ref={ref}>{display}</span>;
}
```

- [ ] **Step 5: Verify + commit**

Run: `npm run build`
Expected: compiles clean.

```bash
git add package.json package-lock.json src/app/globals.css src/components/motion
git commit -m "feat: motion primitives (Reveal, CountUp) and redesign tokens"
```

---

### Task 2: Static content module for new sections

**Files:**
- Create: `src/lib/content-extra.ts`

- [ ] **Step 1: Create `src/lib/content-extra.ts`**

```ts
// Static content for redesign sections the CMS /home/ payload doesn't cover
// yet (prevention narrative, corporate band, trust marks). Typed and shaped
// like src/lib/content.ts so wiring these into the Django CMS later is a
// drop-in change (mirror the getHome fallback pattern).

export const trustMarks = [
  { icon: "shield-check", label: "Certified vaccines & cold-chain handling" },
  { icon: "stethoscope", label: "Licensed healthcare professionals" },
  { icon: "globe", label: "Featured by Univ. of Utah Lassonde Institute" },
] as const;

export const prevention = {
  eyebrow: "Why Prevention",
  title: "The best treatment is the one you never need",
  description:
    "Vaccine-preventable diseases still send thousands of Nigerian families to hospital every year. Staying protected is simpler — and far cheaper — than treating an illness after it strikes.",
  points: [
    {
      icon: "wallet",
      title: "A fraction of the cost of treatment",
      body: "A single hospital admission for a preventable disease can cost 10× more than the vaccine that stops it. Prevention protects your health and your pocket.",
    },
    {
      icon: "shield-check",
      title: "Protection that compounds",
      body: "Every completed schedule — from a baby's birth dose to an adult booster — builds immunity that keeps working for years, for you and everyone around you.",
    },
    {
      icon: "clock",
      title: "Timing is everything",
      body: "Vaccines work best on schedule. We track the dates, send the reminders and fit appointments around your life, so no dose slips through.",
    },
  ],
  ctaLabel: "Explore our services",
  ctaHref: "/what-we-do",
} as const;

export const corporate = {
  eyebrow: "For Organizations",
  title: "A healthier team is your competitive edge",
  description:
    "From banks to schools to NGOs, organizations across Lagos trust Inocul8 to keep their people protected — on-site, on schedule, with zero disruption to the workday.",
  points: [
    { title: "On-site vaccination days", body: "We come to your office with certified vaccines, licensed staff and full cold-chain handling." },
    { title: "Screenings & health talks", body: "Practical wellness sessions and health checks your team will actually use." },
    { title: "Fewer sick days", body: "Immunized teams lose fewer days to preventable illness — HR sees it in the numbers." },
  ],
  ctaLabel: "Request a corporate proposal",
  ctaHref: "/contact",
} as const;

export const heroTrustLine = [
  "Certified vaccines",
  "Same-day yellow fever cards",
  "Pay-small-small plans",
] as const;
```

- [ ] **Step 2: Verify + commit**

Run: `npm run build` → clean.

```bash
git add src/lib/content-extra.ts
git commit -m "feat: static content for prevention, corporate and trust sections"
```

---

### Task 3: Hero redesign (signature moment)

**Files:**
- Create: `src/components/sections/hero-visual.tsx` (client)
- Modify: `src/components/sections/hero.tsx` (stays server)

- [ ] **Step 1: Create `src/components/sections/hero-visual.tsx`**

Floating glassmorphic "protection journey" cards with staggered entrance and gentle pointer parallax (desktop pointer devices only; reduced-motion renders static).

```tsx
"use client";

import { CalendarCheck, ShieldCheck, Plane, Star, Check } from "lucide-react";
import {
  LazyMotion,
  domAnimation,
  m,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { site } from "@/lib/site";

const spring = { stiffness: 60, damping: 18 };

export function HeroVisual({ rating = site.rating }: { rating?: { value: number; count: number } }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, spring);
  const sy = useSpring(my, spring);
  // Two parallax depths — foreground cards drift more than background ones.
  const nearX = useTransform(sx, (v) => v * 16);
  const nearY = useTransform(sy, (v) => v * 12);
  const farX = useTransform(sx, (v) => v * -10);
  const farY = useTransform(sy, (v) => v * -8);

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }

  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 28, scale: 0.97 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <LazyMotion features={domAnimation} strict>
      <div
        onPointerMove={onPointerMove}
        aria-hidden
        className="relative mx-auto aspect-[5/4] w-full max-w-lg select-none sm:aspect-[4/3] lg:aspect-[5/4]"
      >
        {/* Soft organic backdrop */}
        <div className="absolute inset-x-6 inset-y-2 rounded-[3rem] bg-gradient-to-br from-brand-100 via-brand-50 to-accent-400/10 blur-0" />
        <div className="absolute right-4 top-6 size-40 rounded-full bg-brand-200/50 blur-2xl" />
        <div className="absolute bottom-8 left-2 size-32 rounded-full bg-accent-400/20 blur-2xl" />

        {/* Vaccination record — the anchor card */}
        <m.div {...enter(0.15)} style={reduce ? undefined : { x: farX, y: farY }} className="absolute left-1/2 top-1/2 w-[min(72%,300px)] -translate-x-1/2 -translate-y-1/2">
          <div className="rounded-2xl border border-white/60 bg-white/85 p-5 shadow-float backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-600 text-white">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <p className="font-display text-base font-semibold text-ink-900">Vaccination record</p>
                <p className="text-xs text-muted">Up to date · Inocul8</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2.5">
              {[
                { label: "Hepatitis B", done: true },
                { label: "Yellow fever", done: true },
                { label: "HPV — dose 2 of 3", done: false },
              ].map((d) => (
                <li key={d.label} className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{d.label}</span>
                  {d.done ? (
                    <span className="grid size-5 place-items-center rounded-full bg-brand-100 text-brand-700">
                      <Check className="size-3" />
                    </span>
                  ) : (
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-brand-100">
                      <span className="block h-full w-2/3 rounded-full bg-brand-500" />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </m.div>

        {/* Appointment confirmed */}
        <m.div {...enter(0.35)} style={reduce ? undefined : { x: nearX, y: nearY }} className="absolute -left-1 top-6 w-[min(58%,230px)] animate-float sm:left-0">
          <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-float backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-accent-500/15 text-accent-600">
                <CalendarCheck className="size-4" />
              </span>
              <p className="text-sm font-semibold text-ink-900">Appointment confirmed</p>
            </div>
            <p className="mt-2 text-xs text-muted">Today · 2:30 PM · Ajah access point</p>
          </div>
        </m.div>

        {/* Yellow fever card */}
        <m.div {...enter(0.5)} style={reduce ? undefined : { x: nearX, y: nearY }} className="absolute -right-1 bottom-16 hidden w-[min(56%,220px)] animate-float [animation-delay:1.2s] sm:right-0 sm:block">
          <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-float backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-gold-400/20 text-gold-500">
                <Plane className="size-4" />
              </span>
              <p className="text-sm font-semibold text-ink-900">Yellow fever card</p>
            </div>
            <p className="mt-2 text-xs text-muted">Same-day · valid for life</p>
          </div>
        </m.div>

        {/* Google rating badge */}
        <m.div {...enter(0.65)} style={reduce ? undefined : { x: farX, y: farY }} className="absolute bottom-2 left-6 sm:left-10">
          <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/90 py-2 pl-3 pr-4 shadow-float backdrop-blur-md">
            <span className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-gold-400 text-gold-400" />
              ))}
            </span>
            <p className="text-xs font-semibold text-ink-900">
              {rating.value} · {rating.count}+ reviews
            </p>
          </div>
        </m.div>
      </div>
    </LazyMotion>
  );
}
```

- [ ] **Step 2: Rewrite `src/components/sections/hero.tsx`**

Keeps every CMS prop (`content`, `rating`) and the CTA targets; swaps the placeholder photo panel for `HeroVisual`; adds the micro trust line.

```tsx
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { HeroVisual } from "@/components/sections/hero-visual";
import { site, whatsappHref } from "@/lib/site";
import { heroTrustLine } from "@/lib/content-extra";
import { fillRating, HOME_CONTENT_FALLBACK, type HomeContent } from "@/lib/home";

export function Hero({
  content = HOME_CONTENT_FALLBACK,
  rating = site.rating,
}: {
  content?: HomeContent;
  rating?: { value: number; count: number };
}) {
  // Split the title so the highlight tail renders in the brand gradient.
  const highlight = content.hero_title_highlight;
  const idx = highlight ? content.hero_title.lastIndexOf(highlight) : -1;
  const head = idx >= 0 ? content.hero_title.slice(0, idx) : content.hero_title;
  const tail = idx >= 0 ? content.hero_title.slice(idx) : "";

  return (
    <section className="relative overflow-hidden bg-mesh-warm">
      <Container className="grid items-center gap-14 py-16 lg:min-h-[calc(85svh)] lg:grid-cols-12 lg:py-20">
        {/* Copy */}
        <div className="animate-fade-up lg:col-span-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-brand-700 shadow-soft backdrop-blur">
            <span className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-gold-400 text-gold-400" />
              ))}
            </span>
            {fillRating(content.hero_badge, rating.value, rating.count)}
          </div>

          <h1 className="mt-6 font-display text-[2.6rem] font-semibold leading-[1.06] tracking-tight text-ink-900 sm:text-5xl lg:text-6xl xl:text-[4.25rem]">
            {head}
            {tail && <span className="text-gradient">{tail}</span>}
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{content.hero_subtitle}</p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button href={site.bookingUrl} variant="accent" size="lg">
              {content.hero_cta_primary}
            </Button>
            <Button href={whatsappHref} variant="outline" size="lg">
              {content.hero_cta_secondary}
            </Button>
          </div>

          <ul className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-ink-700">
            {heroTrustLine.map((label, i) => (
              <li key={label} className="flex items-center gap-3">
                {i > 0 && <span aria-hidden className="size-1 rounded-full bg-brand-300" />}
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* Visual */}
        <div className="lg:col-span-6">
          <HeroVisual rating={rating} />
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 3: Verify in browser**

Start dev server (`.claude/launch.json` name or `npm run dev` via preview tools), open `/`:
- Cards animate in staggered; float gently; parallax follows mouse on desktop.
- 375px: layout stacks, no horizontal scroll, yellow-fever card hidden, others fit.
- Emulate reduced motion → static render.
- H1 renders CMS/fallback text with gradient tail.

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/hero.tsx src/components/sections/hero-visual.tsx
git commit -m "feat: redesigned hero with floating protection-journey visual"
```

---

### Task 4: Trust bar (replaces StatsBar)

**Files:**
- Create: `src/components/sections/trust-bar.tsx`
- Delete: `src/components/sections/stats-bar.tsx`
- Modify: `src/app/page.tsx` (import swap)

- [ ] **Step 1: Create `src/components/sections/trust-bar.tsx`**

```tsx
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
```

- [ ] **Step 2: Swap into `src/app/page.tsx`**

Replace the StatsBar import/usage:
```tsx
import { TrustBar } from "@/components/sections/trust-bar";
// ...
<TrustBar stats={home.stats} />
```
Delete `src/components/sections/stats-bar.tsx` (nothing else imports it — verify with grep first: `StatsBar` should only match page.tsx).

- [ ] **Step 3: Verify + commit**

`npm run build` clean; browser: counters animate on scroll into view (4.9★ counts up, "Near you" static).

```bash
git add -A src/components/sections src/app/page.tsx
git commit -m "feat: trust bar with animated counters and credibility marks"
```

---

### Task 5: "Why prevention matters" section (new)

**Files:**
- Create: `src/components/sections/prevention.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create `src/components/sections/prevention.tsx`**

```tsx
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/motion/reveal";
import { prevention } from "@/lib/content-extra";

/** Editorial "problem/risk" beat of the storytelling arc — why preventive
 * care matters, before we show what we offer. Static content for now. */
export function Prevention() {
  return (
    <section className="bg-brand-50/60 py-20 sm:py-24">
      <Container className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeading
            align="left"
            eyebrow={prevention.eyebrow}
            title={prevention.title}
            description={prevention.description}
          />
          <Link
            href={prevention.ctaHref}
            className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            {prevention.ctaLabel} <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid content-start gap-5 lg:col-span-7">
          {prevention.points.map((point, i) => (
            <Reveal key={point.title} delay={i * 0.08}>
              <div className="flex gap-5 rounded-2xl border border-ink-900/8 bg-white p-6 shadow-soft">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft">
                  <Icon name={point.icon} className="size-6" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink-900">{point.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{point.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: Add to `src/app/page.tsx`** after `<TrustBar …/>`:

```tsx
import { Prevention } from "@/components/sections/prevention";
// ...
<Prevention />
```

- [ ] **Step 3: Verify + commit**

Build clean; browser: cards reveal staggered on scroll.

```bash
git add src/components/sections/prevention.tsx src/app/page.tsx
git commit -m "feat: why-prevention-matters narrative section"
```

---

### Task 6: Services bento grid

**Files:**
- Modify: `src/components/sections/services.tsx`

- [ ] **Step 1: Rewrite `services.tsx`**

Same CMS props. First card becomes the featured tile (spans 2 columns, brand gradient, white text); a fifth "Explore everything" tile links to `/what-we-do` (internal-link win).

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/motion/reveal";
import { HOME_CONTENT_FALLBACK, HOME_FALLBACK, type HomeContent, type ServiceCard } from "@/lib/home";

export function Services({
  content = HOME_CONTENT_FALLBACK,
  cards = HOME_FALLBACK.service_cards,
}: {
  content?: HomeContent;
  cards?: ServiceCard[];
}) {
  const [featured, ...rest] = cards;

  return (
    <section id="services" className="py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow={content.services_eyebrow}
          title={content.services_title}
          description={content.services_description}
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured && (
            <Reveal className="md:col-span-2">
              <Link
                href={featured.href}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-8 shadow-lift transition-transform hover:-translate-y-1"
              >
                <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_85%_15%,white,transparent_45%)]" />
                <span className="relative grid size-12 place-items-center rounded-xl bg-white/15 text-white backdrop-blur">
                  <Icon name={featured.icon} className="size-6" />
                </span>
                <h3 className="relative mt-6 max-w-md font-display text-2xl font-semibold text-white">
                  {featured.title}
                </h3>
                <p className="relative mt-3 max-w-lg flex-1 text-sm leading-relaxed text-white/80">
                  {featured.body}
                </p>
                <span className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                  Learn more
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          )}

          {rest.map((card, i) => (
            <Reveal key={card.title} delay={(i + 1) * 0.06}>
              <Link
                href={card.href}
                className="group flex h-full flex-col rounded-2xl border border-ink-900/8 bg-white p-7 shadow-soft transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift"
              >
                <span className="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <Icon name={card.icon} className="size-6" />
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold text-ink-900">{card.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{card.body}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                  Learn more
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </Reveal>
          ))}

          <Reveal delay={(rest.length + 1) * 0.06}>
            <Link
              href="/what-we-do"
              className="group flex h-full min-h-44 flex-col items-start justify-between rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/40 p-7 transition-colors hover:border-brand-400 hover:bg-brand-50"
            >
              <h3 className="font-display text-xl font-semibold text-brand-700">
                30+ vaccines &amp; health services
              </h3>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                Explore everything we do
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: Verify + commit**

Build clean; browser: featured card spans 2 cols on lg, grid collapses cleanly at md and mobile, all 4 CMS hrefs still present plus `/what-we-do`.

```bash
git add src/components/sections/services.tsx
git commit -m "feat: bento services grid with featured card and explore tile"
```

---

### Task 7: How-it-works interactive timeline

**Files:**
- Create: `src/components/motion/progress-line.tsx` (client)
- Modify: `src/components/sections/how-it-works.tsx`

- [ ] **Step 1: Create `src/components/motion/progress-line.tsx`**

```tsx
"use client";

// Horizontal line that "draws" itself when scrolled into view — used as the
// connector behind the booking-steps timeline.
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";

export function ProgressLine({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <LazyMotion features={domAnimation} strict>
      <m.span
        aria-hidden
        className={className}
        style={{ originX: 0 }}
        initial={reduce ? false : { scaleX: 0 }}
        whileInView={reduce ? undefined : { scaleX: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
    </LazyMotion>
  );
}
```

- [ ] **Step 2: Rewrite `how-it-works.tsx`**

Same CMS props; adds drawn connector, numbered nodes with gradient, a "response time" mini-card, and a WhatsApp secondary CTA.

```tsx
import { MessageCircle } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { ProgressLine } from "@/components/motion/progress-line";
import { site, whatsappHref } from "@/lib/site";
import { HOME_CONTENT_FALLBACK, HOME_FALLBACK, type HomeContent, type ProcessStep } from "@/lib/home";

export function HowItWorks({
  content = HOME_CONTENT_FALLBACK,
  steps = HOME_FALLBACK.steps,
}: {
  content?: HomeContent;
  steps?: ProcessStep[];
}) {
  return (
    <section className="bg-brand-50/60 py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow={content.steps_eyebrow}
          title={content.steps_title}
          description={content.steps_description}
        />

        <div className="relative mt-16">
          {/* Drawn connector behind the step nodes (desktop) */}
          <ProgressLine className="absolute left-[7%] top-7 hidden h-0.5 w-[86%] rounded-full bg-gradient-to-r from-brand-400 via-brand-500 to-accent-500 md:block" />
          <div className="grid gap-10 md:grid-cols-3">
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.15}>
                <div className="relative md:text-center">
                  <div className="relative z-10 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 font-display text-xl font-semibold text-white shadow-lift md:mx-auto">
                    {i + 1}
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold text-ink-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted md:mx-auto md:max-w-xs">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.2}>
          <div className="mx-auto mt-14 flex max-w-2xl flex-col items-center gap-5 rounded-2xl border border-ink-900/8 bg-white p-6 text-center shadow-soft sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-3">
              <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                <MessageCircle className="size-5" />
                <span aria-hidden className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-brand-500 ring-2 ring-white" />
              </span>
              <p className="text-sm text-ink-700">
                <span className="font-semibold text-ink-900">Questions before you book?</span>
                <br className="sm:hidden" /> We reply on WhatsApp within minutes, {site.hours}.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Button href={site.bookingUrl} variant="accent">
                {content.steps_cta_label}
              </Button>
              <Button href={whatsappHref} variant="ghost">
                WhatsApp us
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
```

- [ ] **Step 3: Verify + commit**

Build clean; browser: line draws on scroll (desktop), steps stagger, mini-card CTAs point to Cowva/WhatsApp.

```bash
git add src/components/motion/progress-line.tsx src/components/sections/how-it-works.tsx
git commit -m "feat: animated booking timeline with response-time card"
```

---

### Task 8: Why-Inocul8 upgrade

**Files:**
- Modify: `src/components/sections/why-us.tsx`

- [ ] **Step 1: Rewrite `why-us.tsx`**

Same CMS props; gradient icon rings, staggered reveal, sticky left heading on desktop.

```tsx
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/motion/reveal";
import { HOME_CONTENT_FALLBACK, HOME_FALLBACK, type HomeContent, type ValueProp } from "@/lib/home";

export function WhyUs({
  content = HOME_CONTENT_FALLBACK,
  items = HOME_FALLBACK.value_props,
}: {
  content?: HomeContent;
  items?: ValueProp[];
}) {
  return (
    <section className="py-20 sm:py-24">
      <Container className="grid gap-12 lg:grid-cols-12 lg:items-start">
        <div className="lg:sticky lg:top-28 lg:col-span-4">
          <SectionHeading
            align="left"
            eyebrow={content.whyus_eyebrow}
            title={content.whyus_title}
            description={content.whyus_description}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:col-span-8">
          {items.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08}>
              <div className="group h-full rounded-2xl border border-ink-900/8 bg-white p-7 shadow-soft transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift">
                <span className="grid size-13 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 ring-1 ring-brand-200/60 transition-colors group-hover:from-brand-500 group-hover:to-brand-700 group-hover:text-white">
                  <Icon name={item.icon} className="size-6" />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-ink-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: Verify + commit**

Build clean; browser check hover states + sticky heading ≥1024px.

```bash
git add src/components/sections/why-us.tsx
git commit -m "feat: upgraded why-us cards with gradient icons and sticky heading"
```

---

### Task 9: Corporate solutions band (new)

**Files:**
- Create: `src/components/sections/corporate.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create `src/components/sections/corporate.tsx`**

Inset dark panel (not full-bleed — the adjacent Testimonials section is already full-bleed dark, so an inset rounded panel keeps them visually distinct).

```tsx
import { Check } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { corporate } from "@/lib/content-extra";
import { whatsappHref } from "@/lib/site";

/** Corporate/HR segment band — the one high-contrast moment on the page.
 * Static content for now (CMS wiring is a follow-up). */
export function Corporate() {
  return (
    <section className="py-10 sm:py-14">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-ink-950 px-8 py-14 sm:px-14 lg:px-20">
            <div
              aria-hidden
              className="absolute inset-0 opacity-60 [background-image:radial-gradient(50%_60%_at_85%_10%,rgba(20,168,156,0.25),transparent_60%),radial-gradient(40%_50%_at_10%_90%,rgba(20,168,156,0.15),transparent_55%)]"
            />
            <div className="relative grid gap-10 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-6">
                <span className="inline-block text-sm font-semibold uppercase tracking-[0.2em] text-brand-300">
                  {corporate.eyebrow}
                </span>
                <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
                  {corporate.title}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/70">{corporate.description}</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button href={corporate.ctaHref} variant="accent" size="lg">
                    {corporate.ctaLabel}
                  </Button>
                  <Button
                    href={whatsappHref}
                    size="lg"
                    className="border-2 border-white/25 bg-transparent text-white hover:bg-white/10"
                  >
                    Chat with our team
                  </Button>
                </div>
              </div>
              <ul className="grid gap-4 lg:col-span-6">
                {corporate.points.map((point) => (
                  <li key={point.title} className="flex gap-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-500/20 text-brand-300">
                      <Check className="size-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{point.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-white/60">{point.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: Add to `src/app/page.tsx`** after `<WhyUs …/>`:

```tsx
import { Corporate } from "@/components/sections/corporate";
// ...
<Corporate />
```

- [ ] **Step 3: Verify + commit**

Build clean; browser: dark panel is inset with rounded corners, CTAs → `/contact` and WhatsApp.

```bash
git add src/components/sections/corporate.tsx src/app/page.tsx
git commit -m "feat: corporate solutions dark band"
```

---

### Task 10: Testimonials card upgrade

**Files:**
- Modify: `src/components/sections/testimonials.tsx`

- [ ] **Step 1: Upgrade `TestimonialCard` only** (marquee/grid logic and all props stay):

Replace the `figcaption` block inside `TestimonialCard` with an avatar-initial disc and a verified badge for Google-sourced reviews:

```tsx
      <figcaption className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <span className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-semibold text-white"
          >
            {t.name.trim().charAt(0).toUpperCase()}
          </span>
          <span>
            <span className="block text-sm font-semibold text-white">{t.name}</span>
            <span className="block text-xs text-white/50">{t.role}</span>
          </span>
        </span>
        {(t.source === "google" || t.reviewUrl) && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-brand-300">
            <BadgeCheck className="size-3.5" /> Verified
            {t.reviewUrl && <ExternalLink className="size-3" />}
          </span>
        )}
      </figcaption>
```

Update the lucide import at the top: `import { Star, Quote, ExternalLink, BadgeCheck } from "lucide-react";` and remove the old "View on Google" span it replaces.

- [ ] **Step 2: Verify + commit**

Build clean; browser: cards show initial disc; if API returns Google reviews (`source: "google"`), Verified badge appears and card links out.

```bash
git add src/components/sections/testimonials.tsx
git commit -m "feat: testimonial cards with avatar initials and verified badge"
```

---

### Task 11: Blog teaser — featured layout

**Files:**
- Modify: `src/components/sections/blog-teaser.tsx`

- [ ] **Step 1: Rewrite the card grid** (header row + CMS props unchanged). Replace the current `.grid` block with:

```tsx
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {teasers.map((post, i) => {
            const featured = i === 0;
            return (
              <Reveal key={post.href} delay={i * 0.08} className={featured ? "md:row-span-2" : undefined}>
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
```

Add imports: `import { Reveal } from "@/components/motion/reveal";` and `import { cn } from "@/lib/utils";`.

- [ ] **Step 2: Verify + commit**

Build clean; browser: first post is the tall featured card, other two stack beside it on md+; all three preserved slugs link correctly.

```bash
git add src/components/sections/blog-teaser.tsx
git commit -m "feat: featured blog-teaser layout with category chips"
```

---

### Task 12: FAQ + final CTA polish

**Files:**
- Modify: `src/components/sections/faq.tsx`
- Modify: `src/components/sections/cta-banner.tsx`

- [ ] **Step 1: FAQ — add WhatsApp escape hatch**

The accordion (grid-rows animation, `aria-expanded`) is already solid — keep it. After the accordion `</div>` add:

```tsx
        <p className="mt-8 text-center text-sm text-muted">
          Still unsure?{" "}
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">
            Chat with us on WhatsApp
          </a>{" "}
          — we reply within minutes.
        </p>
```

Add import: `import { whatsappHref } from "@/lib/site";`

- [ ] **Step 2: CTA banner — add phone option + organic shapes**

In `cta-banner.tsx`, inside the button row add a third action after the WhatsApp button:

```tsx
              <Button href={phoneHref} size="lg" variant="ghost" className="text-white hover:bg-white/10">
                Call {site.phones[0]}
              </Button>
```

Update the import: `import { site, whatsappHref, phoneHref } from "@/lib/site";`
And swap the decorative overlay div for slightly stronger organic blobs:

```tsx
          <div aria-hidden className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_15%_15%,white,transparent_38%),radial-gradient(circle_at_85%_75%,rgba(255,148,114,0.7),transparent_40%)]" />
```

- [ ] **Step 3: Verify + commit**

Build clean; browser: FAQ still animates + schema still in page source (`<script type="application/ld+json">` contains FAQPage); CTA shows three actions stacked on mobile.

```bash
git add src/components/sections/faq.tsx src/components/sections/cta-banner.tsx
git commit -m "feat: FAQ WhatsApp escape hatch and richer final CTA"
```

---

### Task 13: Real newsletter + footer upgrade

**Files:**
- Modify: `src/components/newsletter-form.tsx`
- Modify: `src/components/layout/site-footer.tsx`

- [ ] **Step 1: Wire `newsletter-form.tsx` to `/api/contact`**

Django `ContactMessage` requires `name`, `phone`, `message` (`apps/content/models.py:344-348`) — send labelled placeholders so subscriptions are distinguishable in the admin (`service: "Newsletter"`). Include the honeypot field. Real error state — no fake success.

```tsx
"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";

type Status = "idle" | "sending" | "done" | "error";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // ContactMessage requires name/phone/message; label them so
          // newsletter signups are easy to spot and filter in the admin.
          name: "Newsletter subscriber",
          phone: "n/a",
          service: "Newsletter",
          message: `Newsletter signup from the website footer: ${email}`,
          email,
          website: String(new FormData(e.currentTarget).get("website") || ""), // honeypot
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(data.detail || "Something went wrong. Please try again.");
      }
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div className="flex items-center gap-2 rounded-full bg-brand-500/15 px-5 py-3 text-sm text-brand-200" role="status">
        <Check className="size-4" /> You&apos;re subscribed — watch your inbox.
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <form onSubmit={onSubmit} className="flex gap-2">
        {/* Honeypot — hidden from real users, bots fill it and get rejected. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          aria-label="Email address"
          className="h-12 w-full rounded-full border border-white/15 bg-white/10 px-5 text-sm text-white placeholder:text-white/40 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="flex h-12 shrink-0 items-center gap-1.5 rounded-full bg-brand-500 px-5 text-sm font-semibold text-brand-950 transition-colors hover:bg-brand-400 disabled:opacity-60"
        >
          {status === "sending" ? <Loader2 className="size-4 animate-spin" /> : <>Subscribe <ArrowRight className="size-4" /></>}
        </button>
      </form>
      {status === "error" && (
        <p className="mt-2 text-xs text-accent-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Footer upgrade in `site-footer.tsx`**

Keep all props, links, and structure (SEO). Three targeted changes:
1. Root: `bg-ink-900` → `bg-ink-950`.
2. Contact column: add a WhatsApp item after the Phone item:

```tsx
            <li className="flex gap-3">
              <MessageCircle className="mt-0.5 size-4 shrink-0 text-brand-400" />
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="hover:text-brand-300">
                Chat on WhatsApp
              </a>
            </li>
```
(add `MessageCircle` to the lucide import and `whatsappHref` to the site import)

3. Between the link grid `</Container>` and the bottom legal bar, add an assurance row:

```tsx
      <div className="border-t border-white/10">
        <Container className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-6">
          {[
            "Certified vaccines",
            "Cold-chain assured",
            "Licensed professionals",
            "Featured by Univ. of Utah Lassonde Institute",
          ].map((label) => (
            <span key={label} className="flex items-center gap-2 text-xs font-medium text-white/50">
              <ShieldCheck className="size-3.5 text-brand-400" /> {label}
            </span>
          ))}
        </Container>
      </div>
```
(add `ShieldCheck` to the lucide import)

- [ ] **Step 3: Verify newsletter end-to-end + commit**

Dev server: submit a test email in the footer → expect success state and a new "Newsletter subscriber" contact message reaching the API (or a *real* error message if the API rejects — check the network tab via browser tools). Verify honeypot input is not visible/focusable.

```bash
git add src/components/newsletter-form.tsx src/components/layout/site-footer.tsx
git commit -m "feat: real newsletter signup via contact API and upgraded footer"
```

---

### Task 14: Final assembly, QA pass, and CMS copy suggestions

**Files:**
- Modify: `src/app/page.tsx` (final order)
- Create: `docs/superpowers/specs/2026-07-13-cms-copy-suggestions.md`

- [ ] **Step 1: Confirm final `page.tsx` order**

```tsx
      <Hero content={content} rating={rating} />
      <TrustBar stats={home.stats} />
      <Prevention />
      <Services content={content} cards={home.service_cards} />
      <HowItWorks content={content} steps={home.steps} />
      <WhyUs content={content} items={home.value_props} />
      <Corporate />
      <Testimonials content={content} testimonials={home.testimonials} rating={rating} />
      <BlogTeaser content={content} teasers={home.blog_teasers} />
      <Faq content={content} faqs={home.faqs} />
      <CtaBanner content={content} />
```
(JsonLd, spacer div, and MobileBookBar stay as-is.)

- [ ] **Step 2: Full QA pass** (browser tools against the dev server)

- Widths 320 / 375 / 768 / 1280 / 1920: no horizontal scroll anywhere; screenshot each.
- Keyboard: skip link → header → every CTA/accordion reachable; visible focus rings.
- Reduced motion emulation: page renders fully static, marquee scrollable.
- Page source: exactly one `<h1>`; FAQPage + Organization JSON-LD present; all preserved links (`/what-we-do/*`, 3 blog slugs, footer nav) in the HTML.
- Console: zero errors/warnings.
- `npm run build`: clean; note homepage first-load JS (should stay modest — motion adds ~15-20 kB gzip via LazyMotion).

- [ ] **Step 3: Write CMS copy suggestions doc**

Create `docs/superpowers/specs/2026-07-13-cms-copy-suggestions.md` with improved values for each Django-admin `HomeContent` field (hero_title, section titles/descriptions, cta copy) matching the new design's tone — for the user to paste into the admin. Suggested hero: title "Protection for the people you love, on your schedule." (highlight: "on your schedule."), subtitle tightened to one sentence + proof clause. Cover every field in `HomeContent`; keep `{rating}`/`{count}` placeholders where used today.

- [ ] **Step 4: Final commit**

```bash
git add src/app/page.tsx docs/superpowers/specs/2026-07-13-cms-copy-suggestions.md
git commit -m "feat: assemble redesigned homepage and CMS copy suggestions"
```

---

## Self-review notes

- **Spec coverage:** hero ✔ (T3), trust indicators ✔ (T4), why-prevention ✔ (T5), services ✔ (T6), booking process ✔ (T7), why-us ✔ (T8), statistics ✔ (T4 counters), corporate ✔ (T9), testimonials ✔ (T10), blog ✔ (T11), FAQ ✔ (T12), final CTA ✔ (T12), footer/newsletter ✔ (T13), design-system extensions ✔ (T1), CMS copy handoff ✔ (T14). Reading time intentionally dropped (documented deviation).
- **Types:** `IconName` values used in `content-extra.ts` (`shield-check`, `stethoscope`, `globe`, `wallet`, `clock`) all exist in `icon.tsx`'s map. `Reveal`/`CountUp`/`ProgressLine` signatures consistent across tasks.
- **No placeholder steps** — every code step carries the actual code or an exact anchored edit.
