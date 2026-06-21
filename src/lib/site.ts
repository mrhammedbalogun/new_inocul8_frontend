// Single source of truth for brand facts, navigation IA, and homepage content.
// Nav structure mirrors the live "What We Do" mega-menu; slugs preserve SEO equity.

export const site = {
  name: "Inocul8",
  legalName: "Inocul8",
  tagline: "Convenient · Timely · Safe",
  description:
    "Convenient and affordable vaccination and preventive health services at your doorstep. Childhood immunization, travel health & yellow fever cards, adult vaccines, and corporate wellness in Lagos, Nigeria.",
  url: "https://inocul8.com.ng",
  email: "info@inocul8.com.ng",
  phones: ["07063736485", "08160962414"],
  whatsapp: "2347063736485",
  hours: "Mon – Sat, 08:30 – 18:00",
  rating: { value: 4.9, count: 59 },
  address: {
    street: "Blk A2, Suite 359 & 360, HFP Eastline Complex",
    locality: "Abraham Adesanya, Ajah",
    region: "Lagos",
    country: "Nigeria",
  },
  socials: {
    instagram: "https://instagram.com/inocul8",
    facebook: "https://facebook.com/inocul8",
    twitter: "https://twitter.com/inocul8",
    linkedin: "https://linkedin.com/company/inocul8",
  },
  bookingUrl: "/book",
} as const;

export const phoneHref = `tel:+234${site.phones[0].replace(/^0/, "")}`;
export const whatsappHref = `https://wa.me/${site.whatsapp}`;

export type NavLink = { label: string; href: string };
export type MegaColumn = { heading: string; href: string; links: NavLink[] };

// "What We Do" mega-menu — 6 columns from the live site IA.
export const megaMenu: MegaColumn[] = [
  {
    heading: "Immunization Services",
    href: "/what-we-do/immunization-services",
    links: [
      { label: "Birth Dose Immunization", href: "/what-we-do/immunization-services/birth-dose-immunization" },
      { label: "Six Weeks Immunization", href: "/what-we-do/immunization-services/six-weeks-immunization" },
      { label: "Ten Weeks Immunization", href: "/what-we-do/immunization-services/ten-weeks-immunization" },
      { label: "14 Week Immunization", href: "/what-we-do/immunization-services/14-week-immunization" },
      { label: "5 Months Immunization", href: "/what-we-do/immunization-services/5-months-immunization" },
      { label: "6 Months Immunization", href: "/what-we-do/immunization-services/6-months-immunization" },
      { label: "9 Month Immunization", href: "/what-we-do/immunization-services/9-month-immunization" },
      { label: "12-Month Catch-Up", href: "/what-we-do/immunization-services/12-month-catch-up-immunization" },
      { label: "18-Month Catch-Up", href: "/what-we-do/immunization-services/18-month-catch-up-immunization" },
      { label: "4 – 6 Years Immunization", href: "/what-we-do/immunization-services/4-6-years-immunization" },
      { label: "9-Year-Old HPV Immunization", href: "/what-we-do/immunization-services/9-year-old-hpv-immunization" },
    ],
  },
  {
    heading: "Sexual & Reproductive Health",
    href: "/what-we-do/sexual-reproductive-health-services",
    links: [
      { label: "Hepatitis B Immunization", href: "/hepatitis-b" },
      { label: "HPV Immunization", href: "/what-we-do/sexual-reproductive-health-services/hpv" },
      { label: "HPV (Pay Small Small)", href: "/what-we-do/sexual-reproductive-health-services/hpv-immunization-pay-small-small-package" },
      { label: "Hepatitis A (HAV)", href: "/what-we-do/sexual-reproductive-health-services/hepatitis-a-hav" },
      { label: "Gonorrhea", href: "/what-we-do/sexual-reproductive-health-services/gonorrhea" },
      { label: "HIV PEP", href: "/what-we-do/sexual-reproductive-health-services/human-immunodeficiency-virus-hiv-pep" },
      { label: "HIV PrEP", href: "/what-we-do/sexual-reproductive-health-services/human-immunodeficiency-virus-hiv-prep" },
    ],
  },
  {
    heading: "Travel Health Services",
    href: "/what-we-do/travel-health-services",
    links: [
      { label: "USA / Canada Travel Bundle", href: "/what-we-do/travel-health-services/usa-canada-travel-bundles" },
      { label: "Australia Travel Bundle", href: "/what-we-do/travel-health-services/australia-travel-bundle" },
      { label: "Africa / Asia / Europe Bundle", href: "/what-we-do/travel-health-services/africa-asia-europe-travel-bundle" },
      { label: "Yellow Fever Travel Packages", href: "/yellow-fever" },
      { label: "Yellow Fever International Premium", href: "/yellow-fever-travel-international-premium" },
      { label: "Meningitis Travel Bundle", href: "/what-we-do/travel-health-services/meningitis-travel-bundle" },
    ],
  },
  {
    heading: "myHealth Services",
    href: "/what-we-do/myhealth-services",
    links: [
      { label: "myHealth Hepatitis B", href: "/what-we-do/myhealth-services/myhealth-hepatitis-b" },
      { label: "myHealth Genital Warts", href: "/genital-warts" },
      { label: "myHealth Genital Herpes", href: "/what-we-do/myhealth-services/myhealth-genital-herpes" },
    ],
  },
  {
    heading: "Other Immunization",
    href: "/what-we-do/other-immunization-services",
    links: [
      { label: "Flu Vaccine", href: "/what-we-do/other-immunization-services/flu-vaccine" },
      { label: "Shingles (Shingrix)", href: "/what-we-do/other-immunization-services/shingles-vaccine-shingrix" },
      { label: "Meningococcal B (Bexsero)", href: "/what-we-do/other-immunization-services/meningococcal-b-vaccine-bexsero" },
      { label: "Hep B Immunoglobulin (HBIG)", href: "/what-we-do/other-immunization-services/hepatitis-b-immunoglobulin-hbig" },
      { label: "Rabies Vaccine", href: "/what-we-do/other-immunization-services/rabies-vaccine-pre-exposure-or-post-exposure-prophylaxis" },
      { label: "Tetanus & Polio (Adults)", href: "/what-we-do/other-immunization-services/tetanus-polio-containing-vaccines-adults" },
      { label: "Tetanus & Polio (Children)", href: "/what-we-do/other-immunization-services/tetanus-polio-containing-vaccines-children" },
      { label: "Pneumococcal (PCV)", href: "/what-we-do/other-immunization-services/pneumococcal-conjugate-vaccine-pcv-packages" },
      { label: "Typhoid Packages", href: "/what-we-do/other-immunization-services/typhoid-packages" },
      { label: "Cholera Packages", href: "/what-we-do/other-immunization-services/cholera-packages" },
    ],
  },
  {
    heading: "Employee Wellness",
    href: "/what-we-do/employee-wellness-initiative",
    links: [
      { label: "Corporate Immunization", href: "/what-we-do/employee-wellness-initiative#immunization" },
      { label: "Health Talks & Screenings", href: "/what-we-do/employee-wellness-initiative#screenings" },
      { label: "On-site Vaccinations", href: "/what-we-do/employee-wellness-initiative#onsite" },
    ],
  },
];

export const mainNav: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About us", href: "/about-us" },
  { label: "What We Do", href: "/what-we-do" },
  { label: "Contact", href: "/contact" },
  { label: "Blog", href: "/blogpost" },
];

export const footerServices: NavLink[] = [
  { label: "Immunization Services", href: "/what-we-do/immunization-services" },
  { label: "Sexual & Reproductive Health", href: "/what-we-do/sexual-reproductive-health-services" },
  { label: "Travel Health Services", href: "/what-we-do/travel-health-services" },
  { label: "myHealth Services", href: "/what-we-do/myhealth-services" },
  { label: "Other Immunization", href: "/what-we-do/other-immunization-services" },
  { label: "Employee Wellness Initiative", href: "/what-we-do/employee-wellness-initiative" },
];
