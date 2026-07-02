import { site } from "@/lib/site";
import { faqs } from "@/lib/content";

const phoneIntl = `+234${site.phones[0].replace(/^0/, "")}`;

export const organizationSchema = (rating: { value: number; count: number } = site.rating) => ({
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
    ratingValue: String(rating.value),
    reviewCount: String(rating.count),
    bestRating: "5",
  },
  sameAs: Object.values(site.socials),
});

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

/** FAQPage schema from an ordered list of {q, a} (defaults to the static FAQs). */
export function faqSchemaFrom(items: { q: string; a: string }[] = [...faqs]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export const faqSchema = faqSchemaFrom();

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

/** Article schema for a blog post. */
export function articleSchema(opts: {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    datePublished: new Date(opts.datePublished.replace(" ", "T")).toISOString(),
    dateModified: new Date((opts.dateModified || opts.datePublished).replace(" ", "T")).toISOString(),
    author: { "@id": `${site.url}/#organization` },
    publisher: { "@id": `${site.url}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${site.url}${opts.path}` },
    url: `${site.url}${opts.path}`,
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
