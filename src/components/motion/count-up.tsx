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
