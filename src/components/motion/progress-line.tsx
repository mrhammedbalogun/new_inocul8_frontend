"use client";

// Horizontal line that "draws" itself when scrolled into view — used as the
// connector behind the booking-steps timeline.
import { m, useReducedMotion } from "motion/react";
import { MotionLazy } from "./lazy";

export function ProgressLine({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <MotionLazy>
      <m.span
        aria-hidden
        className={className}
        style={{ originX: 0 }}
        initial={reduce ? false : { scaleX: 0 }}
        whileInView={reduce ? undefined : { scaleX: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
    </MotionLazy>
  );
}
