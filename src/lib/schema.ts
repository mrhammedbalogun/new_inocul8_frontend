import { site } from "@/lib/site";
import { faqs } from "@/lib/content";

const phoneIntl = `+234${site.phones[0].replace(/^0/, "")}`;

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": ["Organization", "MedicalBusiness", "MedicalClinic"],
  "@id": `${site.url}/#organization`,
  name: site.name,
  url: site.url,
  email: site.email,
  telephone: phoneIntl,
  description: site.description,
  slogan: "Convenient and affordable vaccination and preventive health services at your doorstep.",
  medicalSpecialty: ["PublicHealth", "PreventiveMedicine"],
  address: {
    "@type": "PostalAddress",
    streetAddress: site.address.street,
    addressLocality: site.address.locality,
    addressRegion: site.address.region,
    addressCountry: "NG",
  },
  openingHours: "Mo-Sa 08:30-18:00",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: String(site.rating.value),
    reviewCount: String(site.rating.count),
    bestRating: "5",
  },
  sameAs: Object.values(site.socials),
};

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${site.url}/#website`,
  url: site.url,
  name: site.name,
  publisher: { "@id": `${site.url}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${site.url}/?s={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

/** BreadcrumbList from an ordered list of {name, path} crumbs (paths are site-relative). */
export function breadcrumbSchema(crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${site.url}${c.path === "/" ? "" : c.path}`,
    })),
  };
}

/** Medical service/procedure offered by the clinic — for a service detail page. */
export function medicalServiceSchema(opts: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name: opts.name,
    description: opts.description,
    url: `${site.url}${opts.path}`,
    procedureType: "https://schema.org/NoteworthyType",
    provider: { "@id": `${site.url}/#organization` },
    areaServed: { "@type": "City", name: "Lagos" },
  };
}
