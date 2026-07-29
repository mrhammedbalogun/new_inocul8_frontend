import type { Metadata, Viewport } from "next";
import { Geist, Fraunces } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";

/**
 * Bare shell only. Everything belonging to the public marketing site — header,
 * footer, the nav/settings CMS fetches, the Organization/WebSite JSON-LD and
 * the site-wide SEO defaults — lives in `(site)/layout.tsx`, so the studio
 * inherits none of it.
 *
 * That split is not cosmetic. A route-transition or animation provider in a
 * shared layout can unmount and remount the page component on navigation,
 * which would silently destroy the editor's in-memory ProseMirror state — undo
 * history and any unflushed autosave debounce. A full-screen editor also wants
 * zero tempting navigation targets beside unsaved work, and the studio should
 * not depend on the public content API merely to open.
 *
 * Fonts and globals.css stay here: both trees need the same design tokens, and
 * forking them would fork the type system.
 */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
};

export const viewport: Viewport = {
  themeColor: "#0c887e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${fraunces.variable}`}>
      <body className="flex min-h-full flex-col font-sans antialiased">{children}</body>
    </html>
  );
}
