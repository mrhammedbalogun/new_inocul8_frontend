import type { Metadata } from "next";
import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/service/breadcrumbs";
import { ContactForm } from "@/components/contact/contact-form";
import { MobileBookBar } from "@/components/mobile-book-bar";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbSchema } from "@/lib/schema";
import { site, phoneHref, whatsappHref } from "@/lib/site";
import { getPage } from "@/lib/pages";

const fullAddress = `${site.address.street}, ${site.address.locality}, ${site.address.region}, ${site.address.country}`;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("contact");
  return {
    title: page?.seoTitle || "Contact Us",
    description:
      page?.metaDescription ||
      `Get in touch with Inocul8 — visit us at ${site.address.locality}, ${site.address.region}, call ${site.phones[0]}, or send an enquiry. ${site.hours}.`,
    alternates: { canonical: "/contact" },
    openGraph: { title: "Contact Inocul8", description: page?.metaDescription, url: "/contact", type: "website" },
  };
}

const contactItems = [
  { icon: MapPin, label: "Visit us", value: fullAddress, href: `https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}` },
  { icon: Phone, label: "Call us", value: site.phones.join(" · "), href: phoneHref },
  { icon: Mail, label: "Email us", value: site.email, href: `mailto:${site.email}` },
  { icon: Clock, label: "Opening hours", value: site.hours },
];

export default function ContactPage() {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema(crumbs),
          { "@context": "https://schema.org", "@type": "ContactPage", name: "Contact Inocul8", url: `${site.url}/contact` },
        ]}
      />

      <section className="bg-mesh border-b border-ink-900/5 py-12 sm:py-16">
        <Container>
          <Breadcrumbs crumbs={crumbs} />
          <div className="mt-6 max-w-3xl">
            <span className="inline-block text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
              Contact
            </span>
            <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
              We&apos;d love to hear from you
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              Questions, bookings or corporate enquiries — reach out and our team will respond
              promptly. We also come to your home, office or an access point near you.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div>
              <div className="grid gap-4 sm:grid-cols-2">
                {contactItems.map((item) => {
                  const Inner = (
                    <>
                      <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                        <item.icon className="size-5" />
                      </span>
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-ink-900">{item.label}</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted">{item.value}</p>
                      </div>
                    </>
                  );
                  return item.href ? (
                    <a
                      key={item.label}
                      href={item.href}
                      target={item.href.startsWith("http") ? "_blank" : undefined}
                      rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="flex flex-col rounded-2xl border border-ink-900/8 bg-white p-5 shadow-soft transition hover:border-brand-200 hover:shadow-lift"
                    >
                      {Inner}
                    </a>
                  ) : (
                    <div key={item.label} className="flex flex-col rounded-2xl border border-ink-900/8 bg-white p-5 shadow-soft">
                      {Inner}
                    </div>
                  );
                })}
              </div>

              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-5 transition hover:shadow-lift"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-brand-600 text-white">
                  <MessageCircle className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900">Chat on WhatsApp</p>
                  <p className="mt-0.5 text-sm text-muted">Fastest way to reach us</p>
                </div>
              </a>

              <div className="mt-6 overflow-hidden rounded-2xl border border-ink-900/8 shadow-soft">
                <iframe
                  title="Inocul8 location map"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`}
                  className="h-64 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-ink-900/8 bg-white p-6 shadow-soft sm:p-8">
              <h2 className="font-display text-2xl font-semibold text-ink-900">Send us a message</h2>
              <p className="mt-2 text-sm text-muted">Fields marked * are required.</p>
              <div className="mt-6">
                <ContactForm />
              </div>
            </div>
          </div>
        </Container>
      </section>

      <div className="h-20 lg:hidden" />
      <MobileBookBar />
    </>
  );
}
