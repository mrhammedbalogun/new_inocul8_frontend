import { Hero } from "@/components/sections/hero";
import { StatsBar } from "@/components/sections/stats-bar";
import { Services } from "@/components/sections/services";
import { HowItWorks } from "@/components/sections/how-it-works";
import { WhyUs } from "@/components/sections/why-us";
import { Testimonials } from "@/components/sections/testimonials";
import { BlogTeaser } from "@/components/sections/blog-teaser";
import { Faq } from "@/components/sections/faq";
import { CtaBanner } from "@/components/sections/cta-banner";
import { MobileBookBar } from "@/components/mobile-book-bar";
import { JsonLd } from "@/components/seo/json-ld";
import { faqSchema } from "@/lib/schema";

export default function HomePage() {
  return (
    <>
      <JsonLd data={faqSchema} />
      <Hero />
      <StatsBar />
      <Services />
      <HowItWorks />
      <WhyUs />
      <Testimonials />
      <BlogTeaser />
      <Faq />
      <CtaBanner />
      {/* spacer so content clears the mobile sticky bar */}
      <div className="h-20 lg:hidden" />
      <MobileBookBar />
    </>
  );
}
