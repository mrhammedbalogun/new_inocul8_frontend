import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inocul8 Blog Studio",
  robots: { index: false, follow: false },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-neutral-50 text-ink-900">{children}</div>;
}
