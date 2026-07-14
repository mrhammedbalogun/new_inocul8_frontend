"use client";

import { CalendarCheck, ShieldCheck, Plane, Star, Check } from "lucide-react";
import { m, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { MotionLazy } from "@/components/motion/lazy";
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
    <MotionLazy>
      <div
        onPointerMove={onPointerMove}
        aria-hidden
        className="relative mx-auto aspect-[5/4] w-full max-w-lg select-none sm:aspect-[4/3] lg:aspect-[5/4]"
      >
        {/* Soft organic backdrop */}
        <div className="absolute inset-x-6 inset-y-2 rounded-[3rem] bg-gradient-to-br from-brand-100 via-brand-50 to-accent-400/10" />
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
        <m.div {...enter(0.5)} style={reduce ? undefined : { x: nearX, y: nearY }} className="absolute -right-1 bottom-6 hidden w-[min(56%,220px)] animate-float [animation-delay:1.2s] sm:right-0 sm:block">
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
    </MotionLazy>
  );
}
