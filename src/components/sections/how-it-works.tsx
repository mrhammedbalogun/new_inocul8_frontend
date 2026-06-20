import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { steps } from "@/lib/content";
import { site } from "@/lib/site";

export function HowItWorks() {
  return (
    <section className="bg-brand-50/60 py-20 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="How It Works"
          title="Protected in three simple steps"
          description="No queues, no guesswork. Book in minutes and get care wherever you are."
        />

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="relative">
              {/* connector */}
              {i < steps.length - 1 && (
                <span className="absolute left-[2.75rem] top-7 hidden h-px w-[calc(100%-3rem)] bg-gradient-to-r from-brand-300 to-transparent md:block" />
              )}
              <div className="relative flex size-14 items-center justify-center rounded-2xl bg-brand-600 font-display text-xl font-semibold text-white shadow-lift">
                {i + 1}
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold text-ink-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Button href={site.bookingUrl} variant="accent" size="lg">
            Book Now
          </Button>
        </div>
      </Container>
    </section>
  );
}
