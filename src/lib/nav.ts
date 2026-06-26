// Navigation link layer. Main nav + footer link lists are editable in the CMS
// (/nav/), while the "What We Do" mega-menu is derived from the service tree
// (see lib/site.ts megaMenu). Falls back to the static site.ts lists.

import { apiGet } from "@/lib/api";
import { mainNav, footerServices, type NavLink } from "@/lib/site";

export type NavData = {
  main: NavLink[];
  footer_services: NavLink[];
  footer_company: NavLink[];
  footer_legal: NavLink[];
};

const FALLBACK: NavData = {
  main: [...mainNav],
  footer_services: [...footerServices],
  footer_company: [...mainNav],
  footer_legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms", href: "/terms" },
  ],
};

/** Fetch editable nav/footer link lists, falling back to the static site.ts IA. */
export async function getNav(): Promise<NavData> {
  const data = await apiGet<Partial<NavData>>("/nav/", FALLBACK);
  // Guard against partial responses / empty groups from the API.
  return {
    main: data.main?.length ? data.main : FALLBACK.main,
    footer_services: data.footer_services?.length ? data.footer_services : FALLBACK.footer_services,
    footer_company: data.footer_company?.length ? data.footer_company : FALLBACK.footer_company,
    footer_legal: data.footer_legal?.length ? data.footer_legal : FALLBACK.footer_legal,
  };
}
