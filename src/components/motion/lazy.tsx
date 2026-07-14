"use client";

// Shared LazyMotion boundary for all motion client islands. Features are
// loaded via dynamic import so the animation runtime lands in its own chunk.
import { LazyMotion } from "motion/react";

const loadFeatures = () => import("./features").then((mod) => mod.default);

export function MotionLazy({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
