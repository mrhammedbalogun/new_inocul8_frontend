// Homepage content blocks. Blog teasers use the real top-ranking posts (GSC, 16mo).

export const serviceCards = [
  {
    title: "Vaccinations for Adults & Children",
    body: "Prevention is safer, easier, and cheaper than a cure. A complete range of preventive vaccines — hepatitis B, yellow fever, HPV, typhoid and the full childhood immunization ladder.",
    href: "/what-we-do/immunization-services",
    icon: "syringe",
  },
  {
    title: "myHealth: Chronic Infection Care",
    body: "Living with hepatitis B, genital warts or herpes shouldn't mean facing it alone. A dedicated partner: regular consultations, affordable medicines & labs, and lifestyle coaching.",
    href: "/what-we-do/myhealth-services",
    icon: "heart-pulse",
  },
  {
    title: "Your Passport to Healthy Travel",
    body: "Travel with confidence. We review your itinerary and provide the travel immunizations, yellow fever cards and health advice you need — wherever you're headed.",
    href: "/what-we-do/travel-health-services",
    icon: "plane",
  },
  {
    title: "Employee Health Solutions",
    body: "Your people are your most valuable asset. From health talks to on-site vaccinations and screenings, build a healthier, happier workforce while reducing sick leave.",
    href: "/what-we-do/employee-wellness-initiative",
    icon: "building",
  },
] as const;

export const steps = [
  {
    title: "Select your service",
    body: "Choose the vaccine or health service you need. Unsure? Book a free consultation and we'll guide you.",
  },
  {
    title: "Book & pay online",
    body: "Reserve a slot at an access point near you, and complete payment securely.",
  },
  {
    title: "Get protected",
    body: "Receive your vaccination, lab test or medication — most appointments done in under 10 minutes.",
  },
] as const;

export const whyUs = [
  {
    title: "Convenient",
    body: "We put your comfort first — get care at an access point near you, on your schedule.",
    icon: "map-pin",
  },
  {
    title: "Affordable",
    body: "Premium preventive care without straining your pocket, including pay-small-small plans.",
    icon: "wallet",
  },
  {
    title: "Timely",
    body: "On time, every time. Most appointments are completed in under 10 minutes, start to finish.",
    icon: "clock",
  },
  {
    title: "Safe & Certified",
    body: "Certified vaccines, trained professionals, and proper cold-chain handling you can trust.",
    icon: "shield-check",
  },
] as const;

export const stats = [
  { value: "4.9★", label: "Average rating (59+ reviews)" },
  { value: "30+", label: "Vaccines & health services" },
  { value: "Near you", label: "Access points across Lagos" },
] as const;

export const testimonials = [
  {
    quote:
      "Got my yellow fever card the same day without stress. Quick, professional, and I was done in minutes. Highly recommend Inocul8.",
    name: "Adaeze O.",
    role: "Frequent traveller, Lagos",
  },
  {
    quote:
      "We use Inocul8 for our company's staff immunization drive every year. Professional, punctual, and the pricing is fair.",
    name: "Tunde A.",
    role: "HR Lead, Lekki",
  },
  {
    quote:
      "Their myHealth plan made managing my hepatitis B affordable and far less scary. Real support, every step.",
    name: "Chidinma E.",
    role: "myHealth member",
  },
] as const;

export const faqs = [
  {
    q: "Where can I get vaccinated?",
    a: "At our Ajah clinic or any of our access points near you — pick the location and time that suit you when you book. For companies, we also run on-site vaccination and screening sessions at your workplace.",
  },
  {
    q: "How do I get a yellow fever card in Lagos?",
    a: "Book a yellow fever travel package, get vaccinated by our certified team, and receive your authentic yellow fever card — same-day options are available for urgent travel.",
  },
  {
    q: "Which vaccines do you offer?",
    a: "The full childhood immunization ladder (birth to 4–6 years), travel vaccines, HPV, hepatitis A & B, typhoid, cholera, rabies, flu, shingles, meningococcal and more.",
  },
  {
    q: "How much do your services cost?",
    a: "Pricing varies by service, and we offer affordable bundles plus pay-small-small plans for HPV and other vaccines. Contact us or book a free consultation for a tailored quote.",
  },
  {
    q: "Are your vaccines certified and safe?",
    a: "Absolutely. We use certified vaccines administered by trained healthcare professionals with proper cold-chain handling from storage to delivery.",
  },
] as const;

// Real top-ranking posts (GSC 16-mo) — preserve these slugs.
export const blogTeasers = [
  {
    title: "How to get a yellow fever card in Nigeria: a simple guide",
    href: "/how-to-get-yellow-fever-card-in-nigeria-a-simple-guide",
    category: "Travel Health",
    excerpt: "Everything you need to know to get an authentic yellow fever card quickly and legitimately.",
  },
  {
    title: "Yellow fever card: how to know if it's original or fake",
    href: "/yellow-fever-card-how-to-know-if-its-original-or-fake",
    category: "Travel Health",
    excerpt: "Spot the difference between a genuine yellow fever certificate and a forgery before you travel.",
  },
  {
    title: "HPV treatment cost in Nigeria: a cost breakdown",
    href: "/hpv-treatment-cost-in-nigeria-a-cost-breakdown",
    category: "Sexual Health",
    excerpt: "A transparent look at what HPV prevention and treatment really costs in Nigeria.",
  },
] as const;
