import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationSchema, websiteSchema } from "@/lib/schema";
import { site } from "@/lib/site";
import { getNav } from "@/lib/nav";
import { getSiteRating } from "@/lib/settings";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Inocul8 — Vaccination & Preventive Health at Your Convenience | Lagos",
    template: "%s | Inocul8",
  },
  description: site.description,
  keywords: [
    "vaccination Lagos",
    "yellow fever card Lagos",
    "travel vaccines Nigeria",
    "childhood immunization Lagos",
    "HPV vaccine Nigeria",
    "vaccination clinic Lagos",
  ],
  applicationName: site.name,
  authors: [{ name: site.name }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: site.url,
    siteName: site.name,
    title: "Inocul8 — Vaccination & Preventive Health at Your Convenience",
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Inocul8 — Vaccination & Preventive Health at Your Convenience",
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default async function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nav = await getNav();
  const rating = await getSiteRating();
  return (
    <>
        <JsonLd data={[organizationSchema(rating), websiteSchema]} />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader mainNav={nav.main} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter
          services={nav.footer_services}
          company={nav.footer_company}
          legal={nav.footer_legal}
        />
    </>
  );
}
