"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X, Phone, Star, Clock, ChevronRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { mainNav, megaMenu, site, phoneHref } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMegaOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50">
      {/* Utility bar */}
      <div className="hidden bg-ink-900 text-white/80 lg:block">
        <Container className="flex h-9 items-center justify-between text-xs">
          <div className="flex items-center gap-5">
            <a href={phoneHref} className="flex items-center gap-1.5 hover:text-white">
              <Phone className="size-3.5" /> {site.phones[0]}
            </a>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" /> {site.hours}
            </span>
          </div>
          <span className="flex items-center gap-1.5">
            <Star className="size-3.5 fill-gold-400 text-gold-400" />
            <strong className="font-semibold text-white">{site.rating.value}</strong> from{" "}
            {site.rating.count}+ happy patients
          </span>
        </Container>
      </div>

      {/* Main bar */}
      <div
        className={cn(
          "border-b bg-white/90 backdrop-blur-md transition-all",
          scrolled ? "border-ink-900/10 shadow-soft" : "border-transparent"
        )}
        onMouseLeave={() => setMegaOpen(false)}
      >
        <Container className="flex h-16 items-center justify-between gap-4 lg:h-[72px]">
          <Link href="/" aria-label="Inocul8 home" className="shrink-0">
            <Logo priority />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {mainNav.map((link) =>
              link.label === "What We Do" ? (
                <button
                  key={link.href}
                  onMouseEnter={() => setMegaOpen(true)}
                  onClick={() => setMegaOpen((v) => !v)}
                  aria-expanded={megaOpen}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    megaOpen ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:text-brand-700"
                  )}
                >
                  {link.label}
                  <ChevronDown className={cn("size-4 transition-transform", megaOpen && "rotate-180")} />
                </button>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onMouseEnter={() => setMegaOpen(false)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors hover:text-brand-700",
                    pathname === link.href ? "text-brand-700" : "text-ink-700"
                  )}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Button href={site.bookingUrl} variant="accent" size="sm" className="hidden sm:inline-flex">
              Book Now
            </Button>
            <button
              className="grid size-10 place-items-center rounded-full text-ink-800 hover:bg-brand-50 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-6" />
            </button>
          </div>
        </Container>

        {/* Mega menu */}
        {megaOpen && (
          <div
            className="absolute inset-x-0 top-full hidden border-b border-ink-900/10 bg-white shadow-lift lg:block"
            onMouseEnter={() => setMegaOpen(true)}
          >
            <Container className="grid grid-cols-3 gap-x-8 gap-y-8 py-8 xl:grid-cols-6">
              {megaMenu.map((col) => (
                <div key={col.heading}>
                  <Link
                    href={col.href}
                    className="block text-sm font-semibold text-ink-900 hover:text-brand-700"
                  >
                    {col.heading}
                  </Link>
                  <ul className="mt-3 space-y-1.5">
                    {col.links.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className="text-sm leading-snug text-muted transition-colors hover:text-brand-700"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </Container>
          </div>
        )}
      </div>

      {/* Mobile drawer */}
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} pathname={pathname} />
    </header>
  );
}

function MobileDrawer({
  open,
  onClose,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
}) {
  const [openCol, setOpenCol] = useState<string | null>(null);
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[88%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 lg:hidden",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex h-16 items-center justify-between border-b border-ink-900/10 px-5">
          <Logo />
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="grid size-10 place-items-center rounded-full text-ink-800 hover:bg-brand-50"
          >
            <X className="size-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-5 py-4">
          {mainNav
            .filter((l) => l.label !== "What We Do")
            .slice(0, 1)
            .map((l) => (
              <DrawerLink key={l.href} href={l.href} active={pathname === l.href}>
                {l.label}
              </DrawerLink>
            ))}

          {/* What We Do accordion */}
          <div className="border-b border-ink-900/10">
            <button
              onClick={() => setOpenCol(openCol === "wwd" ? null : "wwd")}
              className="flex w-full items-center justify-between py-3.5 text-base font-medium text-ink-900"
            >
              What We Do
              <ChevronDown className={cn("size-5 transition-transform", openCol === "wwd" && "rotate-180")} />
            </button>
            {openCol === "wwd" && (
              <div className="space-y-4 pb-4">
                {megaMenu.map((col) => (
                  <div key={col.heading}>
                    <Link href={col.href} className="text-sm font-semibold text-brand-700">
                      {col.heading}
                    </Link>
                    <ul className="mt-1.5 space-y-1 border-l border-brand-100 pl-3">
                      {col.links.map((l) => (
                        <li key={l.href}>
                          <Link href={l.href} className="flex items-center gap-1 py-1 text-sm text-muted">
                            <ChevronRight className="size-3.5 text-brand-300" />
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          {mainNav
            .filter((l) => !["Home", "What We Do"].includes(l.label))
            .map((l) => (
              <DrawerLink key={l.href} href={l.href} active={pathname === l.href}>
                {l.label}
              </DrawerLink>
            ))}
        </nav>

        <div className="border-t border-ink-900/10 p-5">
          <Button href={site.bookingUrl} variant="accent" size="lg" className="w-full">
            Book an Appointment
          </Button>
          <a
            href={phoneHref}
            className="mt-3 flex items-center justify-center gap-2 text-sm font-medium text-ink-700"
          >
            <Phone className="size-4 text-brand-600" /> {site.phones[0]}
          </a>
        </div>
      </div>
    </>
  );
}

function DrawerLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block border-b border-ink-900/10 py-3.5 text-base font-medium",
        active ? "text-brand-700" : "text-ink-900"
      )}
    >
      {children}
    </Link>
  );
}
