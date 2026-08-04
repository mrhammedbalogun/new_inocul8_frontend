"use client";

import Image from "next/image";
import { Plane, Star } from "lucide-react";
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
  // Two parallax depths — the floating cards drift more than the photo.
  const nearX = useTransform(sx, (v) => v * 16);
  const nearY = useTransform(sy, (v) => v * 12);
  const farX = useTransform(sx, (v) => v * -8);
  const farY = useTransform(sy, (v) => v * -6);

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
        className="relative mx-auto w-full max-w-md select-none lg:max-w-lg"
      >
        {/* Soft rotated backdrop the arch sits against */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 top-8 rotate-3 rounded-[3rem] bg-gradient-to-br from-brand-100 via-brand-50 to-accent-400/10"
        />
        <div aria-hidden className="absolute right-2 top-10 size-40 rounded-full bg-brand-200/50 blur-2xl" />
        <div aria-hidden className="absolute bottom-6 left-0 size-32 rounded-full bg-accent-400/20 blur-2xl" />

        {/* The team, in an arch. The photo is content, not decoration — it keeps
            real alt text while the fake-UI cards below stay aria-hidden. */}
        <m.div
          {...enter(0.15)}
          style={reduce ? undefined : { x: farX, y: farY }}
          className="rm-static relative mx-auto w-[86%]"
        >
          <Image
            src="/images/inocul8-team.webp"
            alt="The Inocul8 clinic team — licensed vaccinators in branded scrubs"
            width={1600}
            height={1816}
            priority
            sizes="(min-width: 1024px) 27rem, (min-width: 640px) 24rem, 86vw"
            className="rounded-[11rem_11rem_1.75rem_1.75rem] border-[6px] border-white/85 object-cover shadow-float"
          />
        </m.div>

        {/* Yellow fever card — lower right, over scrubs, never a face */}
        <m.div
          {...enter(0.4)}
          style={reduce ? undefined : { x: nearX, y: nearY }}
          aria-hidden
          className="rm-static absolute -right-1 bottom-16 w-[min(56%,220px)] animate-float sm:right-0"
        >
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

        {/* Google rating badge — lower left */}
        <m.div
          {...enter(0.55)}
          style={reduce ? undefined : { x: nearX, y: nearY }}
          aria-hidden
          className="rm-static absolute -bottom-3 left-2 sm:left-6"
        >
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
