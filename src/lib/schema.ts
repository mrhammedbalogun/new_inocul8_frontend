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
