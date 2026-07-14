import Link from "next/link";
import { MapPin, Mail, Phone, Clock, MessageCircle, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { InstagramIcon, FacebookIcon, XIcon, LinkedinIcon } from "@/components/brand/social-icons";
import { Container } from "@/components/ui/container";
import { NewsletterForm } from "@/components/newsletter-form";
import { site, footerServices, mainNav, phoneHref, whatsappHref, type NavLink } from "@/lib/site";

const DEFAULT_LEGAL: NavLink[] = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms" },
];

export function SiteFooter({
  services = footerServices,
  company = mainNav,
  legal = DEFAULT_LEGAL,
}: {
  services?: NavLink[];
  company?: NavLink[];
  legal?: NavLink[];
}) {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-ink-950 text-white/70">
      {/* Newsletter strip */}
      <div className="border-b border-white/10">
        <Container className="grid gap-6 py-10 md:grid-cols-2 md:items-center">
          <div>
            <h3 className="font-display text-2xl font-semibold text-white">
              Stay ahead of your health.
            </h3>
            <p className="mt-1 text-sm text-white/60">
              Vaccine reminders, travel-health tips and offers — no spam, ever.
            </p>
          </div>
          <NewsletterForm />
        </Container>
      </div>

      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo className="h-11" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Inocul8 is a health-technology company offering preventive healthcare products and
            services to families and organizations across all sectors.
          </p>
          <div className="mt-5 flex gap-2">
            {[
              { Icon: InstagramIcon, href: site.socials.instagram, label: "Instagram" },
              { Icon: FacebookIcon, href: site.socials.facebook, label: "Facebook" },
              { Icon: XIcon, href: site.socials.twitter, label: "X" },
              { Icon: LinkedinIcon, href: site.socials.linkedin, label: "LinkedIn" },
            ].map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noopener noreferrer"
                className="grid size-9 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-brand-500"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Our Services</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {services.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="transition-colors hover:text-brand-300">
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Company</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {company.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="transition-colors hover:text-brand-300">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">Get in touch</h4>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-400" />
              <span>
                {site.address.street}, {site.address.locality}.
              </span>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-brand-400" />
              <a href={`mailto:${site.email}`} className="hover:text-brand-300">
                {site.email}
              </a>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-brand-400" />
              <a href={phoneHref} className="hover:text-brand-300">
                {site.phones.join(", ")}
              </a>
            </li>
            <li className="flex gap-3">
              <MessageCircle className="mt-0.5 size-4 shrink-0 text-brand-400" />
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="hover:text-brand-300">
                Chat on WhatsApp
              </a>
            </li>
            <li className="flex gap-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-brand-400" />
              <span>{site.hours}</span>
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-white/10">
        <Container className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-6">
          {[
            "Certified vaccines",
            "Cold-chain assured",
            "Licensed professionals",
            "Featured by Univ. of Utah Lassonde Institute",
          ].map((label) => (
            <span key={label} className="flex items-center gap-2 text-xs font-medium text-white/50">
              <ShieldCheck className="size-3.5 text-brand-400" /> {label}
            </span>
          ))}
        </Container>
      </div>

      <div className="border-t border-white/10">
        <Container className="flex flex-col items-center justify-between gap-2 py-5 text-xs sm:flex-row">
          <p>© {year} Inocul8. All rights reserved.</p>
          <div className="flex gap-5">
            {legal.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-brand-300">
                {l.label}
              </Link>
            ))}
          </div>
        </Container>
      </div>
    </footer>
  );
}
