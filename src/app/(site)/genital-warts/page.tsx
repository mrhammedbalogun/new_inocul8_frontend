import { notFound } from "next/navigation";
import { StandalonePage } from "@/components/service/standalone-page";
import { getPage, pageMetadata } from "@/lib/pages";

export function generateMetadata() {
  return pageMetadata("genital-warts");
}

export default async function GenitalWartsPage() {
  const page = await getPage("genital-warts");
  if (!page) notFound();
  return (
    <StandalonePage
      page={page}
      crumbs={[
        { name: "Home", path: "/" },
        { name: "What We Do", path: "/what-we-do" },
        { name: "myHealth", path: "/what-we-do/myhealth-services" },
        { name: page.title, path: page.path },
      ]}
    />
  );
}
