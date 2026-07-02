// Homepage content layer. Fetches the aggregated /home/ payload from the CMS
// (Django/DRF) with ISR, and falls back to the static values reconstructed from
// the original design if the API is unavailable — so the homepage never breaks.

import type { IconName } from "@/components/ui/icon";
import { apiGet } from "@/lib/api";
import {
  serviceCards as staticCards,
  steps as staticSteps,
  whyUs as staticWhyUs,
  stats as staticStats,
  testimonials as staticTestimonials,
  faqs as staticFaqs,
  blogTeasers as staticTeasers,
} from "@/lib/content";

export type HomeContent = {
  hero_badge: string;
  hero_title: string;
  hero_title_highlight: string;
  hero_subtitle: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  services_eyebrow: string;
  services_title: string;
  services_description: string;
  steps_eyebrow: string;
  steps_title: string;
  steps_description: string;
  steps_cta_label: string;
  whyus_eyebrow: string;
  whyus_title: string;
  whyus_description: string;
  testimonials_eyebrow: string;
  testimonials_title: string;
  testimonials_description: string;
  blog_eyebrow: string;
  blog_title: string;
  blog_description: string;
  faq_eyebrow: string;
  faq_title: string;
  faq_description: string;
  cta_title: string;
  cta_description: string;
};

export type Stat = { value: string; label: string };
export type ValueProp = { title: string; body: string; icon: IconName };
export type ProcessStep = { title: string; body: string };
export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  rating: number;
  /** "google" when synced from Google reviews; links the card to its source. */
  source?: "manual" | "google";
  reviewUrl?: string;
};
export type ServiceCard = { title: string; body: string; href: string; icon: IconName };
export type HomeFaq = { q: string; a: string };
export type BlogTeaser = { title: string; href: string; category: string; excerpt: string };

export type HomeData = {
  content: HomeContent;
  stats: Stat[];
  value_props: ValueProp[];
  steps: ProcessStep[];
  testimonials: Testimonial[];
  service_cards: ServiceCard[];
  faqs: HomeFaq[];
  blog_teasers: BlogTeaser[];
};

// API shape: faqs come through as {question, answer}; testimonials carry
// snake_case Google-review provenance; everything else matches.
type ApiTestimonial = Testimonial & { source?: "manual" | "google"; review_url?: string };
type ApiHome = Omit<HomeData, "faqs" | "testimonials"> & {
  faqs: { question: string; answer: string }[];
  testimonials: ApiTestimonial[];
};

export const HOME_CONTENT_FALLBACK: HomeContent = {
  hero_badge: "Rated {rating} by {count}+ patients",
  hero_title: "Vaccination & preventive care, at your doorstep.",
  hero_title_highlight: "at your doorstep.",
  hero_subtitle:
    "Convenient, affordable and timely immunization for your family and your team — childhood vaccines, travel health & yellow fever cards, and adult vaccines across Lagos.",
  hero_cta_primary: "Book an Appointment",
  hero_cta_secondary: "Chat on WhatsApp",
  services_eyebrow: "What We Do",
  services_title: "Preventive healthcare, end to end",
  services_description:
    "From a baby's first shots to a healthier workforce, Inocul8 covers every stage of preventive care.",
  steps_eyebrow: "How It Works",
  steps_title: "Protected in three simple steps",
  steps_description: "No queues, no guesswork. Book in minutes and get care wherever you are.",
  steps_cta_label: "Book Now",
  whyus_eyebrow: "Why Choose Us",
  whyus_title: "Your trusted preventive-health partner",
  whyus_description:
    "Understanding vaccines and tracking immunization schedules is hard. We handle the details so you get care at your convenience.",
  testimonials_eyebrow: "Loved by patients",
  testimonials_title: "Trusted across Lagos and beyond",
  testimonials_description:
    "Rated {rating} from {count}+ reviews — here's what people say about care with Inocul8.",
  blog_eyebrow: "From the blog",
  blog_title: "Talk vaccines with Inocul8",
  blog_description:
    "Practical guides on travel health, yellow fever cards and preventive care in Nigeria.",
  faq_eyebrow: "FAQ",
  faq_title: "Questions, answered",
  faq_description:
    "Everything you need to know before you book. Still unsure? Reach out — we're happy to help.",
  cta_title: "Ready to protect what matters most?",
  cta_description:
    "Book a vaccination or a free consultation today — at your home, office, or an access point near you.",
};

/** Static design content, used both as the API fallback and as section defaults
 * so the homepage sections still render when reused on other pages without data. */
export const HOME_FALLBACK: HomeData = {
  content: HOME_CONTENT_FALLBACK,
  stats: staticStats.map((s) => ({ value: s.value, label: s.label })),
  value_props: staticWhyUs.map((w) => ({ title: w.title, body: w.body, icon: w.icon as IconName })),
  steps: staticSteps.map((s) => ({ title: s.title, body: s.body })),
  testimonials: staticTestimonials.map((t) => ({
    quote: t.quote,
    name: t.name,
    role: t.role,
    rating: 5,
  })),
  service_cards: staticCards.map((c) => ({
    title: c.title,
    body: c.body,
    href: c.href,
    icon: c.icon as IconName,
  })),
  faqs: staticFaqs.map((f) => ({ q: f.q, a: f.a })),
  blog_teasers: staticTeasers.map((b) => ({
    title: b.title,
    href: b.href,
    category: b.category,
    excerpt: b.excerpt,
  })),
};

const API_FALLBACK: ApiHome = {
  ...HOME_FALLBACK,
  faqs: staticFaqs.map((f) => ({ question: f.q, answer: f.a })),
};

/** Fetch the full homepage payload, falling back to static design content. */
export async function getHome(): Promise<HomeData> {
  const data = await apiGet<ApiHome>("/home/", API_FALLBACK);
  return {
    ...data,
    faqs: data.faqs.map((f) => ({ q: f.question, a: f.answer })),
    testimonials: data.testimonials.map((t) => ({
      quote: t.quote,
      name: t.name,
      role: t.role,
      rating: t.rating,
      source: t.source,
      reviewUrl: t.review_url || undefined,
    })),
  };
}

/** Replace {rating}/{count} placeholders in CMS copy with live review numbers. */
export function fillRating(text: string, rating: number | string, count: number | string): string {
  return text.replace(/\{rating\}/g, String(rating)).replace(/\{count\}/g, String(count));
}
