import { notFound } from "next/navigation";
import { StandalonePage } from "@/components/service/standalone-page";
import { getPage, pageMetadata } from "@/lib/pages";

const page = getPage("yellow-fever");

export const metadata = pageMetadata("yellow-fever");

export default function YellowFeverPage() {
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
