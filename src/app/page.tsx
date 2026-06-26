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
import { faqSchemaFrom } from "@/lib/schema";
import { getHome } from "@/lib/home";

export default async function HomePage() {
  const home = await getHome();
  const { content } = home;

  return (
    <>
      <JsonLd data={faqSchemaFrom(home.faqs)} />
      <Hero content={content} />
      <StatsBar stats={home.stats} />
      <Services content={content} cards={home.service_cards} />
      <HowItWorks content={content} steps={home.steps} />
      <WhyUs content={content} items={home.value_props} />
      <Testimonials content={content} testimonials={home.testimonials} />
      <BlogTeaser content={content} teasers={home.blog_teasers} />
      <Faq content={content} faqs={home.faqs} />
      <CtaBanner content={content} />
      {/* spacer so content clears the mobile sticky bar */}
      <div className="h-20 lg:hidden" />
      <MobileBookBar />
    </>
  );
}
