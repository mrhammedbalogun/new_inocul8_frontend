// Static content for redesign sections the CMS /home/ payload doesn't cover
// yet (prevention narrative, corporate band, trust marks). Typed and shaped
// like src/lib/content.ts so wiring these into the Django CMS later is a
// drop-in change (mirror the getHome fallback pattern).

export const trustMarks = [
  { icon: "shield-check", label: "Certified vaccines & cold-chain handling" },
  { icon: "stethoscope", label: "Licensed healthcare professionals" },
  { icon: "globe", label: "Featured by Univ. of Utah Lassonde Institute" },
] as const;

export const prevention = {
  eyebrow: "Why Prevention",
  title: "The best treatment is the one you never need",
  description:
    "Vaccine-preventable diseases still put Nigerian families in hospital every year. Staying protected is simpler — and usually far cheaper — than treating an illness after it strikes.",
  points: [
    {
      icon: "wallet",
      title: "A fraction of the cost of treatment",
      body: "A hospital admission for a preventable disease often costs many times more than the vaccine that stops it. Prevention protects your health and your pocket.",
    },
    {
      icon: "shield-check",
      title: "Protection that compounds",
      body: "Every completed schedule — from a baby's birth dose to an adult booster — builds immunity that keeps working for years, for you and everyone around you.",
    },
    {
      icon: "clock",
      title: "Timing is everything",
      body: "Vaccines work best on schedule. We track the dates, send the reminders and fit appointments around your life, so no dose slips through.",
    },
  ],
  ctaLabel: "Explore our services",
  ctaHref: "/what-we-do",
} as const;

export const corporate = {
  eyebrow: "For Organizations",
  title: "A healthier team is your competitive edge",
  description:
    "From banks to schools to NGOs, organizations across Lagos trust Inocul8 to keep their people protected — on-site, on schedule, with zero disruption to the workday.",
  points: [
    { title: "On-site vaccination days", body: "We come to your office with certified vaccines, licensed staff and full cold-chain handling." },
    { title: "Screenings & health talks", body: "Practical wellness sessions and health checks your team will actually use." },
    { title: "Fewer sick days", body: "Immunized teams lose fewer days to preventable illness — a healthier workforce your HR metrics will thank you for." },
  ],
  ctaLabel: "Request a corporate proposal",
  ctaHref: "/contact",
} as const;

export const heroTrustLine = [
  "Certified vaccines",
  "Same-day yellow fever cards",
  "Pay-small-small plans",
] as const;
