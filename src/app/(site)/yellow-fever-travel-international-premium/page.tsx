import { notFound } from "next/navigation";
import { StandalonePage } from "@/components/service/standalone-page";
import { getPage, pageMetadata } from "@/lib/pages";

export function generateMetadata() {
  return pageMetadata("yellow-fever-travel-international-premium");
}

export default async function YellowFeverInternationalPremiumPage() {
  const page = await getPage("yellow-fever-travel-international-premium");
  if (!page) notFound();
  return (
    <StandalonePage
      page={page}
      crumbs={[
        { name: "Home", path: "/" },
        { name: "What We Do", path: "/what-we-do" },
        { name: "Travel Health", path: "/what-we-do/travel-health-services" },
        { name: page.title, path: page.path },
      ]}
    />
  );
}
