import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { site, whatsappHref } from "@/lib/site";

export function CtaBanner() {
  return (
    <section className="py-16">
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-14 text-center shadow-lift sm:px-16">
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_70%,white,transparent_35%)]" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              Ready to protect what matters most?
            </h2>
            <p className="mt-4 text-base text-white/80 sm:text-lg">
              Book a vaccination or a free consultation today — at your home, office, or an access
              point near you.
            </p>
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
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
