import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { site, whatsappHref, phoneHref } from "@/lib/site";
import { HOME_CONTENT_FALLBACK, type HomeContent } from "@/lib/home";

export function CtaBanner({ content = HOME_CONTENT_FALLBACK }: { content?: HomeContent }) {
  return (
    <section className="py-16">
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-14 text-center shadow-lift sm:px-16">
          <div aria-hidden className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_15%_15%,white,transparent_38%),radial-gradient(circle_at_85%_75%,rgba(255,148,114,0.7),transparent_40%)]" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              {content.cta_title}
            </h2>
            <p className="mt-4 text-base text-white/80 sm:text-lg">{content.cta_description}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button href={site.bookingUrl} variant="white" size="lg">
                Book an Appointment
              </Button>
              <Button
                href={whatsappHref}
                size="lg"
                className="border-2 border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                Talk to us on WhatsApp
              </Button>
              <Button href={phoneHref} size="lg" variant="ghost" className="text-white hover:bg-white/10">
                Call {site.phones[0]}
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
