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
